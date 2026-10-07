// SignInPage.tsx  (app/[locale]/(auth)/signin/page.tsx)
'use client'

/**
 * @file SignInPage.tsx
 * Sign In page. Supports two authentication backends, controlled by
 * NEXT_PUBLIC_DB_TYPE:
 *   1. Firebase – Firebase Authentication, then exchanges the ID token for a
 *      server-side session via /api/session.
 *   2. Custom (non-Firebase) – posts credentials to /api/signin and stores the
 *      returned access token in localStorage.
 *
 * After a successful sign-in the user is redirected to the page they originally
 * tried to visit (redirectedFrom), or /console. On success nxf_users is updated
 * (is_logged_in, last_login) and an activity log entry is written.
 *
 * Security rules for this page:
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
import { Mail, Lock, Eye, EyeOff, Loader2 }          from 'lucide-react'
import { useTranslations }                           from 'next-intl'
import { getAuth, signInWithEmailAndPassword }       from 'firebase/auth'
import { initializeApp, getApps }                    from 'firebase/app'
import { parseFirebaseWebConfig }                    from '@/app/lib/firebaseConfig'
import { logActivity }                               from '@/app/lib/logActivity'
import AuthShell                                     from '@/core/AuthShell'
import { CARD, PRIMARY_BUTTON, INPUT_CLASS }         from '@/core/InstallerShell'

export default function SignInPageWrapper() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  )
}

function SignInPage() {
  const t      = useTranslations('signIn')
  const router = useRouter()

  const redirectedFrom =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirectedFrom') || '/console'
      : '/console'

  // ─── State ───────────────────────────────────────────────────────────────

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // ─── Helpers ─────────────────────────────────────────────────────────────

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

  // ─── Sign-In Handler ─────────────────────────────────────────────────────

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

        await recordLogin(data.user.user_id)
      }

      router.replace(redirectedFrom)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AuthShell>
      <form
        className={CARD}
        onSubmit={(e) => {
          e.preventDefault()
          if (!loading) handleSignin()
        }}
      >

        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertTitle>{t('errors.title')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 space-y-5">

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-neutral-800">
              {t('fields.email')}
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-neutral-800">
                {t('fields.password')}
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-neutral-600 underline-offset-4 hover:text-black hover:underline"
              >
                {t('links.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASS} pl-9 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-700"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

        </div>

        <Button type="submit" className={`${PRIMARY_BUTTON} mt-7 w-full`} disabled={loading}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('button.signingIn')}
            </span>
          ) : (
            t('button.signIn')
          )}
        </Button>

        <p className="mt-6 border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600">
          {t('links.noAccount')}{' '}
          <Link
            href="/signup"
            className="font-medium text-black underline-offset-4 hover:underline"
          >
            {t('links.signUp')}
          </Link>
        </p>

      </form>
    </AuthShell>
  )
}