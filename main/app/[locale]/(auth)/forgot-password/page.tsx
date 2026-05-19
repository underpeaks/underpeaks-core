/**
 * ForgotPasswordPage.tsx
 * -----------------------
 * This is the "Forgot Password" page — shown when a user can't remember their password
 * and needs to request a reset link to be sent to their email.
 *
 * What does this page do?
 * ------------------------
 * 1. Shows a simple form where the user enters their email address.
 * 2. Depending on which database type the project uses (set via environment variable),
 *    it either:
 *    a) Uses Firebase's built-in password reset email system (if DB_TYPE is 'firebase')
 *    b) Calls the project's own API endpoint /api/forgot-password for all other DB types
 *       (Supabase, PostgreSQL, MySQL, MongoDB)
 * 3. Shows a success message if the email was sent, or an error message if something went wrong.
 * 4. If the server returns a "notice" (e.g. a manual admin process is needed), that is
 *    shown instead of the standard success message.
 *
 * What is DB_TYPE?
 * -----------------
 * DB_TYPE is an environment variable (NEXT_PUBLIC_DB_TYPE) that tells the app which
 * database the project is using. Because it starts with NEXT_PUBLIC_, it is safely
 * exposed to the browser — it contains no secrets, just the database type name.
 *
 * What is Firebase Auth?
 * -----------------------
 * Firebase is a Google platform that includes its own authentication system.
 * When Firebase is the chosen database, we use Firebase's own sendPasswordResetEmail()
 * function instead of our custom API, because Firebase manages auth entirely on its side.
 *
 * Auto-focus and scroll behaviour:
 * ----------------------------------
 * - On page load, the email input is automatically focused so the user can start typing immediately.
 * - If an error occurs, the page smoothly scrolls the email input into view
 *   (useful on mobile where the keyboard may have pushed content around).
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FiMail } from 'react-icons/fi'

// Firebase client-side SDK imports.
// These are only used when DB_TYPE === 'firebase'.
// getApps() is used to check if Firebase has already been initialised —
// calling initializeApp() more than once throws an error, so we guard against that.
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

/**
 * ForgotPasswordPage
 * -------------------
 * The main component for the forgot password screen.
 * No props are required — all data comes from environment variables and user input.
 */
export default function ForgotPasswordPage() {
  const router = useRouter()

  // The email address the user types into the input field
  const [email, setEmail] = useState('')

  // Whether the reset request is currently being sent (controls button disabled state)
  const [loading, setLoading] = useState(false)

  // An error message to show the user if something goes wrong (null = no error)
  const [error, setError] = useState<string | null>(null)

  // Whether the reset email was sent successfully
  // When true, the form is hidden and a success message is shown
  const [success, setSuccess] = useState(false)

  // A special notice message returned by the server in some cases
  // (e.g. when the reset process requires manual admin involvement)
  const [notice, setNotice] = useState<string | null>(null)

  // A ref (direct reference) to the email input element.
  // Used to auto-focus it on load and scroll it into view on error.
  const emailInputRef = useRef<HTMLInputElement>(null)

  // The database type configured for this project (e.g. 'firebase', 'supabase', 'postgres')
  // This is a public env variable — safe to use in the browser, contains no secrets
  const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

  // Access translated strings for this page
  const t = useTranslations('forgotPassword')

  // ── Effect: Auto-focus email input on page load ──
  // This runs once when the page first renders.
  // Focusing the input automatically saves the user a click.
  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  // ── Effect: Scroll email input into view when an error occurs ──
  // On mobile, the keyboard can push content around — this ensures
  // the email field is always visible when an error message appears.
  useEffect(() => {
    if (error) emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  /**
   * getFirebaseAuth
   * ---------------
   * Initialises the Firebase app (if not already done) and returns the Firebase Auth instance.
   *
   * Why do we initialise Firebase here instead of at the top of the file?
   * -----------------------------------------------------------------------
   * Firebase must only be initialised once. By calling getApps() first, we check
   * if it's already been set up — if it has, we skip initialisation and just return
   * the existing auth instance. This prevents "Firebase already initialised" errors.
   *
   * The Firebase config is read from an environment variable (NEXT_PUBLIC_FIREBASE_CONFIG)
   * which should contain the full Firebase project config as a JSON string.
   * This config is not secret (Firebase projects publish it), but we never log it.
   *
   * @returns The Firebase Auth instance for this project
   * @throws  If NEXT_PUBLIC_FIREBASE_CONFIG is missing or invalid JSON
   */
  function getFirebaseAuth() {
    const configStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
    if (!configStr) throw new Error(t('errors.firebaseConfigMissing'))

    // Parse the JSON config string — never log this value
    const firebaseConfig = JSON.parse(configStr)

    // Only initialise Firebase if it hasn't been initialised yet
    if (!getApps().length) initializeApp(firebaseConfig)

    return getAuth()
  }

  /**
   * handleNoticeOk
   * ---------------
   * Called when the user clicks OK on a server notice alert.
   * Redirects the user back to the sign-in page.
   */
  const handleNoticeOk = () => router.push('/signin')

  /**
   * handleSubmit
   * -------------
   * Called when the user clicks "Send Reset Link".
   *
   * Flow:
   *  1. Validates that the email field is not empty
   *  2. Clears any previous error/success state
   *  3. Depending on DB_TYPE:
   *     - Firebase: uses Firebase Auth's sendPasswordResetEmail()
   *     - All others: calls /api/forgot-password with the email
   *  4. On success: shows the success message
   *  5. On failure: shows a descriptive error message
   */
  const handleSubmit = async () => {
    // Validate: email must not be empty
    if (!email) return setError(t('validation.emailRequired'))

    // Reset all state before making the request
    setLoading(true)
    setError(null)
    setSuccess(false)
    setNotice(null)

    try {
      if (DB_TYPE === 'firebase') {
        // ── Firebase password reset ──
        // Firebase handles the whole reset flow — it sends the email automatically.
        // We pass a 'url' option so that after the user resets their password,
        // Firebase redirects them back to our sign-in page.
        const auth = getFirebaseAuth()
        await sendPasswordResetEmail(auth, email, {
          url: `${window.location.origin}/signin`,
        })
        setSuccess(true)

        // TODO: Implement auto-redirect to /signin after a short delay.
        // The success message currently says "Redirecting to login..." but
        // no redirect is actually happening. Add something like:
        //   setTimeout(() => router.push('/signin'), 3000)

      } else {
        // ── Custom API password reset (all non-Firebase DB types) ──
        // We POST the email address to our own API endpoint, which handles
        // token generation and email sending server-side.
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()

        // If the server returned a non-2xx status code, treat it as an error
        if (!res.ok) throw new Error(data.error || t('errors.sendFailed'))

        // Some server responses include a 'notice' instead of a standard success.
        // This happens when the reset process requires manual admin steps.
        if (data.notice) {
          setNotice(data.notice)
        } else {
          setSuccess(true)

          // TODO: Same as above — add auto-redirect after success
        }
      }
    } catch (err: any) {
      // Show a user-friendly error — err.message comes from either Firebase
      // or our own API, so it should already be reasonably descriptive
      setError(err.message || t('errors.sendFailed'))
    } finally {
      // Always stop the loading state when done, whether success or failure
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">

        {/* Page heading */}
        <h1 className="text-2xl font-bold text-black mb-4">
          {t('title')}
        </h1>

        {/* Instruction text shown above the form */}
        <p className="text-sm text-gray-500 mb-6">
          {t('description')}
        </p>

        {/* ── Notice Alert ── */}
        {/* Shown when the server returns a special notice (e.g. manual admin process) */}
        {notice && (
          <Alert variant="default" className="mb-4 flex flex-col gap-4">
            <div>
              <AlertTitle>{t('notice.title')}</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </div>
            <Button onClick={handleNoticeOk} className="w-full mt-2">
              {t('notice.button')}
            </Button>
          </Alert>
        )}

        {/* ── Success Alert ── */}
        {/* Shown when the reset email was sent successfully */}
        {success && !notice && (
          <Alert variant="default" className="mb-4 flex flex-col gap-4">
            <div>
              <AlertTitle>{t('success.title')}</AlertTitle>
              <AlertDescription>
                {t('success.description')}
              </AlertDescription>
            </div>
            <Button onClick={() => router.push('/signin')} className="w-full mt-2">
              {t('success.button')}
            </Button>
          </Alert>
        )}

        {/* ── Form ── */}
        {/* Hidden once success or notice is shown */}
        {!success && !notice && (
          <>
            {/* Error alert — shown above the form when something goes wrong */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>{t('error.title')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email address label and input */}
            <Label htmlFor="email" className="text-black mb-1">
              {t('form.emailLabel')}
            </Label>
            <div className="relative mb-4">
              {/* Mail icon positioned inside the left side of the input */}
              <FiMail className="absolute left-3 top-3 text-gray-500" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                placeholder={t('form.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                ref={emailInputRef}
                aria-describedby="email-error"
              />
            </div>

            {/* Submit button — disabled while the request is in flight */}
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? t('form.buttonSending') : t('form.buttonSend')}
            </Button>
          </>
        )}

      </div>
    </div>
  )
}