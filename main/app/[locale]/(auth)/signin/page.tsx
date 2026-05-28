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
 * On successful sign-in (both flows):
 *   - nxf_users is updated: is_logged_in → true, last_login → now
 *   - An activity log entry is written via POST /api/activity-log
 *
 * ⚠️  Security rules for this page:
 *   - Never log the user's email or password
 *   - Never log the Firebase ID token or access token
 *   - Never expose raw internal errors to the console in production
 */

import { useState, Suspense }                        from 'react'
import { useRouter }                                 from 'next/navigation'
import Link                                          from 'next/link'
import { Input }                                     from '@/components/ui/input'
import { Button }                                    from '@/components/ui/button'
import { Label }                                     from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription }       from '@/components/ui/alert'
import { FiMail, FiLock }                            from 'react-icons/fi'
import { useTranslations }                           from 'next-intl'
import { getAuth, signInWithEmailAndPassword }       from 'firebase/auth'
import { initializeApp, getApps }                    from 'firebase/app'
import { parseFirebaseWebConfig }                    from '@/app/lib/firebaseConfig'
import { logActivity }                               from '@/app/lib/logActivity'

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
 *   - Updating nxf_users (is_logged_in, last_login) on success
 *   - Writing a user_login activity log entry on success
 *   - Displaying loading and error states
 *   - Redirecting the user after a successful sign-in
 *
 * @returns {JSX.Element}
 */
function SignInPage() {
  const t            = useTranslations('signIn')
  const router       = useRouter()

  /**
   * After sign-in, redirect the user back to the page they were trying to visit.
   * Next.js middleware adds ?redirectedFrom=/some/path when redirecting an
   * unauthenticated user here. Falls back to /console if absent.
   */
  const redirectedFrom =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirectedFrom') || '/console'
      : '/console'

  // ─── State ───────────────────────────────────────────────────────────────────

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * recordLogin
   *
   * Called after a successful sign-in regardless of DB type.
   * Performs two fire-and-forget operations in parallel:
   *
   * 1. PATCH /api/users — sets is_logged_in: true and last_login: now on the
   *    user's nxf_users document. Uses the same PATCH route used by the CMS
   *    users page, extended to accept is_logged_in and last_login fields.
   *
   * 2. POST /api/activity-log — writes a user_login event to
   *    nxf_system_activity_logs. project_id and tenant_id are resolved
   *    server-side — we only pass user_id, action, and context.
   *
   * Both calls are best-effort. A failure here must never block the redirect —
   * the user successfully authenticated and should reach the app regardless.
   *
   * @param userId — The resolved user ID (Firebase UID or nxf_users.user_id).
   */
  async function recordLogin(userId: string): Promise<void> {
    const now = new Date().toISOString()

    await Promise.allSettled([
      // Update nxf_users — mark online and record login time
      fetch('/api/cmsusers', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:        userId,
          target_user_id: userId,
          is_logged_in:   true,
          last_login:     now,
        }),
      }),

      // Write activity log entry
      logActivity(userId, 'user_login', { email }),
    ])
  }

  // ─── Sign-In Handler ─────────────────────────────────────────────────────────

  /**
   * handleSignin
   *
   * Triggered when the user clicks "Sign In".
   *
   * Firebase flow:
   *   1. Initialise Firebase app once (guards against re-init).
   *   2. signInWithEmailAndPassword → UserCredential.
   *   3. getIdToken → POST /api/session (sets HTTP-only session cookie).
   *   4. Store token in localStorage.
   *   5. recordLogin(uid).
   *
   * Custom flow:
   *   1. POST /api/signin with email + password.
   *   2. Store returned accessToken in localStorage.
   *   3. recordLogin(data.user.user_id).
   *
   * On success: redirect to redirectedFrom.
   * On failure: display error in UI.
   */
  async function handleSignin() {
    setLoading(true)
    setError(null)

    try {
      const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

      if (DB_TYPE === 'firebase') {
        // ── Firebase Authentication Flow ──────────────────────────────────

        /**
         * Initialise Firebase once. getApps() guards against the
         * "app already exists" error on re-renders or double calls.
         */
        if (!getApps().length) {
          const firebaseConfig = parseFirebaseWebConfig(
            process.env.NEXT_PUBLIC_FIREBASE_CONFIG
          )
          initializeApp(firebaseConfig)
        }

        const auth           = getAuth()
        const userCredential = await signInWithEmailAndPassword(auth, email, password)

        /**
         * Exchange the Firebase ID token for a server-side session cookie.
         * ⚠️ Never log idToken — it is a short-lived security credential.
         */
        const idToken = await userCredential.user.getIdToken()

        const res  = await fetch('/api/session', {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${idToken}`,
          },
        })
        const data = await res.json()

        if (!res.ok || !data.user) {
          throw new Error(data.error || t('errors.signinFailed'))
        }

        // ⚠️ Never log this value
        localStorage.setItem('authToken', idToken)

        /**
         * Record the login in nxf_users and nxf_system_activity_logs.
         * Uses the Firebase UID as the user identifier — this matches the
         * user_id stored in nxf_users for Firebase installations.
         * Best-effort: await but never let a failure here block the redirect.
         */
        await recordLogin(userCredential.user.uid)

      } else {
        // ── Custom (Non-Firebase) Authentication Flow ─────────────────────

        const res  = await fetch('/api/signin', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || t('errors.signinFailed'))
        }

        // ⚠️ Never log this value
        localStorage.setItem('authToken', data.accessToken)

        /**
         * Record the login. Uses data.user.user_id — the ID field returned
         * by the custom /api/signin endpoint from nxf_users.
         */
        await recordLogin(data.user.user_id)
      }

      /**
       * Sign-in succeeded — navigate to destination.
       * router.replace() removes the sign-in page from history so the user
       * cannot press Back and land here again after logging in.
       */
      router.replace(redirectedFrom)

    } catch (err: any) {
      /**
       * Sign-in failed — show the error in the UI.
       * Raw errors are never logged to avoid exposing auth details in production.
       */
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">

        <h1 className="text-2xl font-bold text-black mb-6">
          {t('heading')}
        </h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t('errors.title')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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

        <p className="mb-4 text-right text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            {t('links.forgotPassword')}
          </Link>
        </p>

        <Button className="w-full mb-4" onClick={handleSignin} disabled={loading}>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              {t('button.signingIn')}
            </div>
          ) : (
            t('button.signIn')
          )}
        </Button>

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