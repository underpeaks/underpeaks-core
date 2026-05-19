'use client'

/**
 * @file SignUpPage.tsx
 * @description
 * This is the Sign Up page for the application. It allows new users to create
 * an account using their full name, email address, and a password.
 *
 * It supports three authentication backends, controlled by NEXT_PUBLIC_DB_TYPE:
 *
 *   1. Firebase — Creates the user via our /api/signup endpoint, then signs them
 *      in with Firebase client SDK purely to trigger a verification email.
 *      The user is signed out immediately after and redirected to /signin.
 *
 *   2. Supabase — Creates the user via our /api/signup endpoint, then calls
 *      supabase.auth.signUp() to trigger Supabase's own verification email flow.
 *      The user is signed out immediately after and redirected to /signin.
 *
 *   3. Custom (PostgreSQL / MySQL / MongoDB) — Only calls /api/signup.
 *      No additional client-side auth step is needed. Redirects to /signin.
 *
 * In all cases, the actual user record is created by the /api/signup endpoint.
 * Firebase and Supabase client calls here are only used to send verification emails.
 *
 * ⚠️  Security rules for this page:
 *   - Never log the user's password or any variation of it
 *   - Never log the Supabase client instance (it contains credentials)
 *   - Never log sensitive user data returned from the API
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock, FiUser } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

// Firebase client SDK imports
import { initializeApp, getApps } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'

// Supabase client SDK import
import { createClient } from '@supabase/supabase-js'

// ─── DB Type Detection ────────────────────────────────────────────────────────
/**
 * Read which database/auth backend this project is configured to use.
 * This is set in your .env file as NEXT_PUBLIC_DB_TYPE (e.g. 'firebase', 'supabase').
 * It starts with NEXT_PUBLIC_ so it is safely available in the browser —
 * it contains no secrets, just the name of the backend type.
 */
const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

// ─── Safe Client Initialisation ──────────────────────────────────────────────
/**
 * We initialise Firebase and Supabase clients at module level (outside the component)
 * so they are only created once when the module first loads, not on every render.
 *
 * We guard each initialisation behind a DB_TYPE check so that:
 *   - Firebase SDK is never loaded or initialised in a Supabase project
 *   - Supabase SDK is never loaded or initialised in a Firebase project
 * This keeps the bundle lean and avoids unnecessary initialisation errors.
 */

/** Firebase Auth instance — only set when DB_TYPE is 'firebase' */
let auth: any = null

/** Supabase client instance — only set when DB_TYPE is 'supabase' */
let supabase: any = null

/**
 * Initialise Firebase if this project uses Firebase.
 *
 * getApps().length checks if a Firebase app has already been initialised.
 * If one exists we reuse it; if not we create a new one.
 * This prevents the "Firebase App already exists" error on hot reloads.
 *
 * NEXT_PUBLIC_FIREBASE_CONFIG is a JSON string containing the Firebase
 * web app config object. It is safe to use in the browser — it contains
 * no admin credentials, only the public web API keys.
 */
if (DB_TYPE === 'firebase' && process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
  const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  auth = getAuth(app)
}

/**
 * Initialise Supabase if this project uses Supabase.
 *
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are intentionally
 * public Supabase credentials — safe to use in the browser.
 * We still guard against them being missing to avoid a runtime crash.
 */
if (
  DB_TYPE === 'supabase' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component SignUpPage
 * @description
 * The main sign-up form component. Handles:
 *   - Capturing full name, email, and password from the user
 *   - Basic client-side validation before submitting
 *   - Calling /api/signup to create the user record
 *   - Triggering email verification via Firebase or Supabase if applicable
 *   - Displaying loading, success, and error states
 *   - Redirecting to /signin after successful registration
 *
 * @returns {JSX.Element}
 */
export default function SignUpPage() {
  /**
   * t() is the translation function from next-intl.
   * All keys for this page live under the "signUp" namespace in en.json.
   */
  const t = useTranslations('signUp')

  /** Router used to redirect the user to /signin after successful sign-up. */
  const router = useRouter()

  // ─── State ─────────────────────────────────────────────────────────────────

  /** The full name typed into the name field. */
  const [full_name, setFullName] = useState('')

  /** The email address typed into the email field. */
  const [email, setEmail] = useState('')

  /**
   * The password typed into the password field.
   * ⚠️ Never log this value under any circumstances.
   */
  const [password, setPassword] = useState('')

  /**
   * True while the sign-up request is in flight.
   * Disables the submit button and shows a loading label to prevent
   * the user from submitting the form multiple times.
   */
  const [loading, setLoading] = useState(false)

  /**
   * Holds an error message when sign-up fails, or null when there is no error.
   * When non-null, a destructive alert is rendered above the form.
   */
  const [error, setError] = useState<string | null>(null)

  /**
   * Holds a success message after the account is created successfully.
   * When non-null, a success alert is rendered above the form.
   */
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // ─── Sign-Up Handler ───────────────────────────────────────────────────────

  /**
   * @function handleSignup
   * @description
   * Triggered when the user clicks the "Sign Up" button.
   *
   * Steps:
   *  1. Clears any previous error or success messages.
   *  2. Runs basic client-side validation (full name, email, password required).
   *  3. Calls /api/signup to create the user record in the database.
   *  4. Depending on DB_TYPE:
   *     - Firebase: signs the user in temporarily just to send a verification
   *       email, then signs them out and redirects to /signin.
   *     - Supabase: calls supabase.auth.signUp() to trigger Supabase's own
   *       verification email, then signs them out and redirects to /signin.
   *     - Custom: just redirects to /signin after the API call succeeds.
   *  5. On failure: maps known Firebase error codes to friendly messages,
   *     falls back to the server's error message for everything else.
   *  6. Always resets loading to false when done.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function handleSignup() {
    setError(null)
    setSuccessMsg(null)

    // ── Client-side validation ──────────────────────────────────────────────
    // Check required fields before making any network requests.
    // This gives the user instant feedback without a round trip to the server.
    if (!full_name.trim()) return setError(t('errors.nameRequired'))
    if (!email.trim()) return setError(t('errors.emailRequired'))
    if (!password.trim()) return setError(t('errors.passwordRequired'))

    setLoading(true)

    try {
      // ── Create user record via API ──────────────────────────────────────────
      /**
       * Send the user's details to our /api/signup endpoint.
       * This creates the actual user record in the database regardless of DB type.
       * Firebase and Supabase client calls below are only for email verification.
       */
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, password }),
      }).then(r => r.json())

      /**
       * If the API returned an error field, throw it so it's caught below.
       * This surfaces server-side validation errors (e.g. email already taken).
       */
      if (res.error) throw new Error(res.error)

      /** Show the success banner — the user's account has been created. */
      setSuccessMsg(t('success.accountCreated'))

      // ── Firebase email verification flow ────────────────────────────────────
      /**
       * For Firebase projects, we sign the user in temporarily using the
       * credentials they just registered with. We do this only to get a
       * Firebase user object so we can call sendEmailVerification() on it.
       * After sending the verification email we immediately sign them out —
       * they should not be considered "logged in" until they verify their email.
       */
      if (DB_TYPE === 'firebase' && auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)

          /**
           * Send a verification email to the user's inbox.
           * The email contains a link that redirects back to /signin after verification.
           * NEXT_PUBLIC_APP_DOMAIN is the base URL of this app (e.g. https://app.nxtflutter.com).
           */
          await sendEmailVerification(userCredential.user, {
            url: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
          })

          /** Sign the user out immediately — they must verify email before logging in. */
          await auth.signOut()

          console.info(t('console.firebaseVerificationSent'))

          setTimeout(() => router.push('/signin'), 2000)
        } catch (firebaseErr: any) {
          /**
           * If the verification email fails, log the step for debugging
           * but do not expose internal Firebase error details to the user.
           */
          console.info(t('console.firebaseVerificationFailed'))
        }
      }

      // ── Supabase email verification flow ────────────────────────────────────
      /**
       * For Supabase projects, we call supabase.auth.signUp() to trigger
       * Supabase's built-in email verification flow. Supabase sends a
       * confirmation email with a link that redirects back to /signin.
       *
       * Note: The user record was already created by /api/signup above.
       * This call is only to initiate Supabase's email verification process.
       */
      if (DB_TYPE === 'supabase' && supabase) {
        try {
          const { data, error: supabaseError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name },
              emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
            },
          })

          if (supabaseError) throw supabaseError

          console.info(t('console.supabaseVerificationSent'))

          /** Sign the user out — they must verify their email before logging in. */
          await supabase.auth.signOut()

          setTimeout(() => router.push('/signin'), 2000)
        } catch (supabaseErr: any) {
          /**
           * If the Supabase verification step fails, show the error to the user
           * so they know something went wrong with the email verification step.
           */
          setError(supabaseErr.message || t('errors.supabaseSignupFailed'))
        }
      }

      /**
       * Fallback redirect for custom DB types (PostgreSQL, MySQL, MongoDB).
       * For these backends there is no email verification client step —
       * just redirect to sign-in after a short delay so the user can read
       * the success message.
       */
      setTimeout(() => router.push('/signin'), 2000)

    } catch (err: any) {
      /**
       * Map known Firebase error codes to friendly, readable messages.
       * Firebase errors have a .code property like 'auth/email-already-in-use'.
       * For unrecognised errors we fall back to the error's message string.
       */
      if (err.code === 'auth/email-already-in-use') {
        setError(t('errors.emailInUse'))
      } else if (err.code === 'auth/invalid-email') {
        setError(t('errors.invalidEmail'))
      } else if (err.code === 'auth/weak-password') {
        setError(t('errors.weakPassword'))
      } else {
        setError(err.message || t('errors.signupFailed'))
      }
    } finally {
      /**
       * Always turn off loading when done, whether sign-up succeeded or failed.
       * The finally block runs after both try and catch, guaranteed.
       */
      setLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">

        {/* Page heading */}
        <h1 className="text-2xl font-bold text-black mb-6">
          {t('heading')}
        </h1>

        {/*
         * Error alert banner.
         * Only rendered when error state is non-null.
         * Shows validation errors and sign-up failure messages.
         */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t('alerts.errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/*
         * Success alert banner.
         * Only rendered when successMsg state is non-null.
         * Shown immediately after the account is created.
         */}
        {successMsg && (
          <Alert variant="default" className="mb-4">
            <AlertTitle>{t('alerts.successTitle')}</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        {/* Full name field */}
        <Label htmlFor="fullName" className="mb-1 text-black">
          {t('fields.fullName')}
        </Label>
        <div className="flex items-center gap-2 mb-4">
          <FiUser className="text-gray-500" />
          <Input
            id="fullName"
            type="text"
            placeholder={t('fields.fullNamePlaceholder')}
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        {/* Email field */}
        <Label htmlFor="email" className="mb-1 text-black">
          {t('fields.email')}
        </Label>
        <div className="flex items-center gap-2 mb-4">
          <FiMail className="text-gray-500" />
          <Input
            id="email"
            type="email"
            placeholder={t('fields.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password field */}
        <Label htmlFor="password" className="mb-1 text-black">
          {t('fields.password')}
        </Label>
        <div className="flex items-center gap-2 mb-6">
          <FiLock className="text-gray-500" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/*
         * Sign Up button.
         * Disabled while loading to prevent duplicate submissions.
         * Shows "Creating..." while the request is in flight.
         */}
        <Button className="w-full mb-4" onClick={handleSignup} disabled={loading}>
          {loading ? t('button.creating') : t('button.signUp')}
        </Button>

        {/* Sign in prompt for users who already have an account */}
        <p className="text-center text-sm text-gray-600">
          {t('links.alreadyHaveAccount')}{' '}
          <Link href="/signin" className="text-blue-600 hover:underline">
            {t('links.loginNow')}
          </Link>
        </p>

      </div>
    </div>
  )
}