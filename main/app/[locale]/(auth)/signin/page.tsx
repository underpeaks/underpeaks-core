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
import { Eye, EyeOff }                               from 'lucide-react'
import { useTranslations }                           from 'next-intl'
import { getAuth, signInWithEmailAndPassword }       from 'firebase/auth'
import { initializeApp, getApps }                    from 'firebase/app'
import { parseFirebaseWebConfig }                    from '@/app/lib/firebaseConfig'
import { logActivity }                               from '@/app/lib/logActivity'

export default function SignInPageWrapper() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  )
}

function SignInPage() {
  const t            = useTranslations('signIn')
  const router       = useRouter()

  const redirectedFrom =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirectedFrom') || '/console'
      : '/console'

  // ─── State ───────────────────────────────────────────────────────────────────

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  async function recordLogin(userId: string): Promise<void> {
    const now = new Date().toISOString()

    await Promise.allSettled([
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
      logActivity(userId, 'user_login', { email }),
    ])
  }

  // ─── Sign-In Handler ─────────────────────────────────────────────────────────

  async function handleSignin() {
    setLoading(true)
    setError(null)

    try {
      const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

      if (DB_TYPE === 'firebase') {
        if (!getApps().length) {
          const firebaseConfig = parseFirebaseWebConfig(
            process.env.NEXT_PUBLIC_FIREBASE_CONFIG
          )
          initializeApp(firebaseConfig)
        }

        const auth           = getAuth()
        const userCredential = await signInWithEmailAndPassword(auth, email, password)

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

        localStorage.setItem('authToken', idToken)
        await recordLogin(userCredential.user.uid)

      } else {
        const res  = await fetch('/api/signin', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email, password }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || t('errors.signinFailed'))
        }

        localStorage.setItem('authToken', data.accessToken)
        console.log('[DEBUG] user_id being passed to recordLogin:', data.user.user_id)
        await recordLogin(data.user.user_id)
      }

      router.replace(redirectedFrom)

    } catch (err: any) {
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
          <div className="relative flex-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
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