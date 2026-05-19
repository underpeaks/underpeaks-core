'use client'

/**
 * @file SignInPage.tsx
 * @description
 * This is the Sign In page for the application. It allows existing users to log in
 * using their email and password.
 *
 * It supports two authentication backends:
 *   1. Firebase – Uses Firebase Authentication to verify credentials, then exchanges
 *      the Firebase ID token for a server-side session via /api/session.
 *   2. Custom (Non-Firebase) – Sends credentials directly to /api/signin and
 *      stores the returned access token in localStorage.
 *
 * The active backend is controlled by the environment variable NEXT_PUBLIC_DB_TYPE.
 * If it equals "firebase", the Firebase flow is used; otherwise the custom flow runs.
 *
 * After a successful sign-in, the user is redirected to either:
 *   - The page they originally tried to visit (via the redirectedFrom query param), or
 *   - The default /console page.
 *
 * ⚠️  Security rules for this page:
 *   - Never log the user's email or password
 *   - Never log the Firebase ID token or access token
 *   - Never expose raw internal errors to the console in production
 */

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'
import { parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'

/**
 * @component SignInPageWrapper
 * @description
 * A wrapper that places SignInPage inside React's <Suspense> boundary.
 *
 * Why is Suspense needed here?
 * SignInPage reads from window.location.search (the URL query string).
 * In Next.js, accessing browser-only APIs like window during server-side
 * rendering (SSR) causes errors. Wrapping in Suspense with a null fallback
 * ensures the component only runs on the client side.
 *
 * @returns {JSX.Element}
 */
export default function SignInPageWrapper() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  )
}

/**
 * @component SignInPage
 * @description
 * The main sign-in form. Handles:
 *   - Capturing email and password input from the user
 *   - Submitting credentials to the correct authentication backend
 *   - Displaying loading and error states
 *   - Redirecting the user after a successful sign-in
 *
 * @returns {JSX.Element}
 */
function SignInPage() {
  /**
   * t() is the translation function from next-intl.
   * Call t('some.key') to get the translated string for that key.
   * All keys live under the "signIn" namespace in en.json.
   */
  const t = useTranslations('signIn')

  /**
   * router lets us programmatically navigate the user to another page.
   * We use router.replace() after a successful sign-in.
   */
  const router = useRouter()

  /**
   * After sign-in, we redirect the user back to the page they were trying to visit.
   * Next.js middleware adds a ?redirectedFrom=/some/path param to the URL when it
   * redirects an unauthenticated user to this sign-in page.
   * If no such param exists, we fall back to /console.
   *
   * The typeof window check prevents a crash during SSR where window doesn't exist.
   */
  const redirectedFrom =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirectedFrom') || '/console'
      : '/console'

  // ─── State ───────────────────────────────────────────────────────────────────

  /** The email address typed into the email field. */
  const [email, setEmail] = useState('')

  /**
   * The password typed into the password field.
   * ⚠️ Never log this value under any circumstances.
   */
  const [password, setPassword] = useState('')

  /**
   * True while the sign-in request is in flight.
   * Disables the submit button and shows a spinner to prevent double submissions.
   */
  const [loading, setLoading] = useState(false)

  /**
   * Holds an error message when sign-in fails, or null when there is no error.
   * When non-null, an error alert is rendered above the form.
   */
  const [error, setError] = useState<string | null>(null)

  // ─── Sign-In Handler ─────────────────────────────────────────────────────────

  /**
   * @function handleSignin
   * @description
   * Triggered when the user clicks the "Sign In" button.
   *
   * Steps:
   *  1. Sets loading to true and clears any previous error.
   *  2. Reads NEXT_PUBLIC_DB_TYPE to decide which auth flow to use.
   *
   *  Firebase flow:
   *   - Initialises Firebase once (guards against re-initialisation).
   *   - Calls signInWithEmailAndPassword() with the user's credentials.
   *   - Gets a short-lived JWT ID token from the authenticated user.
   *   - POSTs that token (in the Authorization header) to /api/session,
   *     which creates a secure server-side session cookie.
   *   - Stores the token in localStorage for client-side authenticated requests.
   *
   *  Custom (non-Firebase) flow:
   *   - POSTs email and password to /api/signin.
   *   - Stores the returned access token in localStorage.
   *
   *  3. On success: redirects to redirectedFrom.
   *  4. On failure: stores the error message in state to display in the UI.
   *  5. Always resets loading to false when done.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function handleSignin() {
    setLoading(true)
    setError(null)

    try {
      const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

      if (DB_TYPE === 'firebase') {
        // ── Firebase Authentication Flow ────────────────────────────────────

        /**
         * Only initialise the Firebase app if it hasn't been initialised yet.
         * getApps() returns all currently active Firebase app instances.
         * This check prevents a "Firebase App named '[DEFAULT]' already exists" error
         * if this function is called more than once or the component re-renders.
         */
        if (!getApps().length) {
          const firebaseConfig = parseFirebaseWebConfig(
            process.env.NEXT_PUBLIC_FIREBASE_CONFIG
          )
          initializeApp(firebaseConfig)
        }

        /** Get the Firebase Auth instance for the default app. */
        const auth = getAuth()

        /**
         * Attempt to sign in the user with their email and password.
         * Firebase verifies the credentials and returns a UserCredential object.
         * If the credentials are wrong, Firebase throws an error here which is
         * caught by the outer try/catch and shown to the user.
         */
        const userCredential = await signInWithEmailAndPassword(auth, email, password)

        /**
         * Get a short-lived JWT ID token from the authenticated Firebase user.
         * This token proves the user's identity to our backend without us ever
         * storing or transmitting their password.
         * ⚠️ Never log this token — it is a security credential.
         */
        const idToken = await userCredential.user.getIdToken()

        /**
         * Send the ID token to /api/session via the Authorization header.
         * Our server verifies the token using the Firebase Admin SDK,
         * then sets a secure HTTP-only session cookie for future requests.
         * We never send credentials in the request body — only in the header.
         */
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        })

        const data = await res.json()

        /**
         * If the server returned a non-OK status or didn't return a user object,
         * throw an error so it gets caught below and shown in the UI.
         */
        if (!res.ok || !data.user) {
          throw new Error(data.error || t('errors.signinFailed'))
        }

        /**
         * Store the Firebase ID token in localStorage for use in client-side
         * authenticated API calls (e.g. calling Firebase services directly).
         * ⚠️ Never log this value.
         */
        localStorage.setItem('authToken', idToken)

      } else {
        // ── Custom (Non-Firebase) Authentication Flow ───────────────────────

        /**
         * Send the user's credentials to our own /api/signin endpoint.
         * The server validates them against its database and returns a JWT
         * access token on success.
         */
        const res = await fetch('/api/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await res.json()

        /**
         * If the server returned a failure response, throw with the server's
         * error message so it surfaces in the UI.
         */
        if (!res.ok || !data.success) {
          throw new Error(data.error || t('errors.signinFailed'))
        }

        /**
         * Store the access token for use in future authenticated API requests.
         * ⚠️ Never log this value.
         */
        localStorage.setItem('authToken', data.accessToken)
      }

      /**
       * Sign-in succeeded — navigate the user to their destination.
       * router.replace() is used instead of router.push() so the sign-in page
       * is removed from the browser history. This prevents the user from pressing
       * Back and landing on the sign-in page again after logging in.
       */
      router.replace(redirectedFrom)

    } catch (err: any) {
      /**
       * Sign-in failed — display the error message in the UI.
       * We do NOT log the raw error to the console to avoid accidentally
       * exposing sensitive auth details (tokens, credentials) in production.
       */
      setError(err.message)
    } finally {
      /**
       * Always turn off loading when done, whether sign-in succeeded or failed.
       * The finally block runs after both try and catch, guaranteed.
       */
      setLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

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
         * Shows the error message returned from the failed sign-in attempt.
         */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t('errors.title')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Email field */}
        <Label htmlFor="email" className="mb-1 text-black">
          {t('fields.email')}
        </Label>
        <div className="flex items-center gap-2 mb-4">
          <FiMail className="text-gray-500" />
          <Input
            id="email"
            type="email"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Forgot password link — right aligned */}
        <p className="mb-4 text-right text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            {t('links.forgotPassword')}
          </Link>
        </p>

        {/*
         * Sign In button.
         * Disabled while loading to prevent duplicate submissions.
         * Shows a spinner with loading text while the request is in flight.
         */}
        <Button className="w-full mb-4" onClick={handleSignin} disabled={loading}>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              {t('button.signingIn')}
            </div>
          ) : (
            t('button.signIn')
          )}
        </Button>

        {/* Sign up prompt for users without an account */}
        <p className="text-center text-sm text-gray-600">
          {t('links.noAccount')}{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            {t('links.signUp')}
          </Link>
        </p>

      </div>
    </div>
  )
}