/**
 * ResetPasswordPage.tsx
 * ----------------------
 * This is the "Reset Password" page — the final step of the password reset flow.
 * The user lands here after clicking the reset link in their email.
 *
 * Where does this fit in the reset flow?
 * ----------------------------------------
 * Step 1 — ForgotPasswordPage.tsx:
 *   The user enters their email. A reset link is sent to their inbox.
 *   The link contains a token in the URL, e.g.:
 *   https://yourcms.com/reset-password?token=abc123...
 *
 * Step 2 — THIS PAGE (ResetPasswordPage.tsx):
 *   The user clicks the link and lands here. They enter a new password and submit.
 *   Depending on the database type, the reset is handled differently:
 *
 *   a) Supabase:
 *      Supabase manages its own auth entirely. When the user clicks the reset link,
 *      Supabase sets a session automatically in the background. We just call
 *      supabase.auth.updateUser() with the new password — no token handling needed.
 *
 *   b) All other DB types (PostgreSQL, MySQL, MongoDB, Firebase custom):
 *      We read the token from the URL query parameter (?token=...), send it to our
 *      own API endpoint (/api/reset-password), which validates the token and
 *      updates the password in the database.
 *
 * What are the possible page states?
 * ------------------------------------
 * This page can render in four different states:
 *  1. Token expired    — shown when the reset link has expired (auto-redirects to forgot-password)
 *  2. Success          — shown after a successful reset (auto-redirects to sign-in)
 *  3. Error            — shown inline above the form when something goes wrong
 *  4. Form             — the default state showing the new password input
 *
 * ⚠️  Security rules for this page:
 *   - Never log the token from the URL
 *   - Never log the password or any variation of it
 *   - Never expose internal error details to the user beyond what is necessary
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

/**
 * ResetPasswordPage
 * ------------------
 * The main component for the reset password screen.
 * No props required — the reset token is read from the URL query string.
 */
export default function ResetPasswordPage() {
  const router = useRouter()

  // useSearchParams() gives us access to the URL query parameters.
  // For this page, we expect a ?token=... parameter in the URL.
  const searchParams = useSearchParams()

  // The reset token extracted from the URL (?token=...).
  // Only used for non-Supabase flows. Null until extracted from the URL.
  // ⚠️ Never log this value — it is a security credential.
  const [token, setToken] = useState<string | null>(null)

  // The new password the user types into the input field.
  // ⚠️ Never log this value under any circumstances.
  const [password, setPassword] = useState('')

  // Whether the reset request is currently in progress (controls button disabled state)
  const [loading, setLoading] = useState(false)

  // Whether the reset completed successfully.
  // When true, the form is replaced with a success message.
  const [submitted, setSubmitted] = useState(false)

  // An error message to show the user if something goes wrong (null = no error shown)
  const [error, setError] = useState<string | null>(null)

  // Whether the reset token has expired.
  // When true, a special "link expired" screen is shown and the user is redirected
  // to the forgot password page automatically.
  const [tokenExpired, setTokenExpired] = useState(false)

  // Access translated strings for this page
  const t = useTranslations('resetPassword')

  // ── Database type detection ──
  // NEXT_PUBLIC_DB_TYPE is set in your .env file and tells the app which database
  // the project is using. It starts with NEXT_PUBLIC_ so it is safely available
  // in the browser — it contains no secrets, just the DB type name (e.g. 'supabase').
  const dbType = process.env.NEXT_PUBLIC_DB_TYPE
  const isSupabase = dbType === 'supabase'

  // ── Supabase client initialisation ──
  // We only create the Supabase client when the DB type is Supabase.
  // This avoids importing or initialising Supabase for projects that don't use it.
  //
  // Why use a dynamic import instead of require()?
  // ------------------------------------------------
  // The original code used require() which is a CommonJS pattern and doesn't work
  // reliably in Next.js App Router (which uses ESM modules). We use a lazy useState
  // with useEffect to initialise the client properly on the client side instead.
  //
  // NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are safe to use
  // in the browser — they are intentionally public Supabase credentials.
  // However, we never log them.
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    // Only initialise the Supabase client if this project uses Supabase
    if (!isSupabase) return

    // Dynamically import the Supabase client only when needed.
    // This keeps the Supabase SDK out of the bundle for non-Supabase projects.
    import('@supabase/supabase-js').then(({ createClient }) => {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      setSupabase(client)
    })
  }, [isSupabase])

  // ── Effect: Extract and validate the token from the URL ──
  // This runs when the page first loads and whenever searchParams changes.
  // For Supabase, we skip token extraction entirely — Supabase handles its own session.
  // For all other DB types, we read the ?token= query parameter from the URL.
  useEffect(() => {
    // Supabase manages its own session after the user clicks the reset link.
    // There is no token in the URL for Supabase — skip this step entirely.
    if (isSupabase) {
      setToken(null)
      setError(null)
      return
    }

    // Read the reset token from the URL query string.
    // ⚠️ Do NOT log this value — it is a security credential.
    const urlToken = searchParams.get('token')

    if (!urlToken) {
      // If no token is in the URL, the link is invalid or incomplete
      setError(t('errors.invalidLink'))
      return
    }

    // Store the token in state so handleReset can use it when the form is submitted
    setToken(urlToken)
  }, [searchParams, isSupabase, t])

  /**
   * handleReset
   * ------------
   * Called when the user clicks "Reset Password".
   *
   * Flow:
   *  1. Validates that the password field is not empty
   *  2. Depending on DB type:
   *     - Supabase: calls supabase.auth.updateUser() directly
   *     - Others:   sends token + password to /api/reset-password
   *  3. On success: shows success screen, auto-redirects to sign-in after 2 seconds
   *  4. On expired token: shows expired screen, auto-redirects to forgot-password after 3 seconds
   *  5. On other errors: shows error message above the form
   */
  const handleReset = async () => {
    // Validate: password must not be empty
    if (!password) return setError(t('errors.passwordRequired'))

    setLoading(true)
    setError(null)

    try {
      // ── Supabase reset flow ──
      // Supabase has its own built-in password update method.
      // After the user clicks the reset link, Supabase sets a session automatically.
      // We just call updateUser() with the new password — no token needed.
      // ⚠️ Never log the password field.
      if (isSupabase && supabase) {
        const { error: supabaseError } = await supabase.auth.updateUser({
          password,
        })

        if (supabaseError) {
          throw new Error(supabaseError.message)
        }

        setSubmitted(true)
        // Auto-redirect to sign-in after 2 seconds so the user has time to read the success message
        setTimeout(() => router.push('/signin'), 2000)
        return
      }

      // ── Custom API reset flow (all non-Supabase DB types) ──
      // We send the token and new password to our own API endpoint.
      // The server validates the token and updates the password in the database.
      // ⚠️ Never log the token or password before or after this call.
      if (!token) return setError(t('errors.missingToken'))

      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Check if the server reported that the token has expired.
        // If so, show the dedicated "link expired" screen and redirect automatically.
        if (data.error?.toLowerCase().includes('expired')) {
          setTokenExpired(true)
          setTimeout(() => router.push('/forgot-password'), 3000)
        } else {
          throw new Error(data.error || t('errors.resetFailed'))
        }
        return
      }

      // Success — show the success screen and redirect to sign-in after 2 seconds
      setSubmitted(true)
      setTimeout(() => router.push('/signin'), 2000)

    } catch (err: any) {
      // Show a user-friendly error message.
      // err.message comes from either Supabase or our own API,
      // so it should already be reasonably descriptive.
      setError(err.message || t('errors.resetFailed'))
    } finally {
      // Always stop the loading state when done, whether success or failure
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER: Token expired screen
  // ─────────────────────────────────────────────
  // Shown when the server tells us the reset token has expired.
  // The user is automatically redirected to the forgot-password page after 3 seconds.
  if (tokenExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md border border-gray-200 bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-4">
            {t('expired.title')}
          </h1>
          <p className="text-gray-600">
            {t('expired.description')}
          </p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Success screen
  // ─────────────────────────────────────────────
  // Shown after the password has been successfully reset.
  // Auto-redirects to sign-in after 2 seconds.
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md border border-gray-200 bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-4">
            {t('success.title')}
          </h1>
          <p className="text-gray-600">
            {t('success.description')}{' '}
            <a href="/signin" className="text-black font-medium underline">
              {t('success.signinLink')}
            </a>{' '}
            {t('success.descriptionSuffix')}
          </p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Reset password form
  // ─────────────────────────────────────────────
  // The default state — shown when neither tokenExpired nor submitted is true.
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">

        {/* Page heading */}
        <h1 className="text-2xl font-bold text-black mb-6">
          {t('title')}
        </h1>

        {/* Error alert — shown above the form when something goes wrong */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t('error.title')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* New password label and input */}
        <Label htmlFor="password" className="text-black mb-1">
          {t('form.passwordLabel')}
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />

        {/* Submit button — disabled while the request is in flight */}
        <Button onClick={handleReset} disabled={loading} className="w-full">
          {loading ? t('form.buttonResetting') : t('form.buttonReset')}
        </Button>

      </div>
    </div>
  )
}