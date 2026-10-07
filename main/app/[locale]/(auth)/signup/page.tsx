// SignUpPage.tsx  (app/[locale]/(auth)/signup/page.tsx)
'use client'

import { useState }                                          from 'react'
import { useRouter }                                         from 'next/navigation'
import Link                                                  from 'next/link'
import { Input }                                             from '@/components/ui/input'
import { Button }                                            from '@/components/ui/button'
import { Label }                                             from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription }               from '@/components/ui/alert'
import { Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { useTranslations }                                   from 'next-intl'
import { initializeApp, getApps }                            from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
}                                                            from 'firebase/auth'
import { createClient }                                      from '@supabase/supabase-js'
import { logActivity }                                       from '@/app/lib/logActivity'
import { parseFirebaseWebConfig }                            from '@/app/lib/firebaseConfig'
import AuthShell                                             from '@/core/AuthShell'
import { CARD, PRIMARY_BUTTON, INPUT_CLASS }                 from '@/core/InstallerShell'

const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

let auth: any     = null
let supabase: any = null

if (DB_TYPE === 'firebase' && process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
  const firebaseConfig = parseFirebaseWebConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  auth = getAuth(app)
}

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

export default function SignUpPage() {
  const t      = useTranslations('signUp')
  const router = useRouter()

  const [full_name,    setFullName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [successMsg,   setSuccessMsg]   = useState<string | null>(null)

  async function handleSignup() {
    setError(null)
    setSuccessMsg(null)

    if (!full_name.trim()) return setError(t('errors.nameRequired'))
    if (!email.trim())     return setError(t('errors.emailRequired'))
    if (!password.trim())  return setError(t('errors.passwordRequired'))

    setLoading(true)

    try {
      const res = await fetch('/api/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_name, email, password }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)

      setSuccessMsg(t('success.accountCreated'))

      const newUserId = res.user_id ?? res.user?.user_id ?? null
      if (newUserId) {
        await logActivity(newUserId, 'user_signup', { email })
      }

      // ── Firebase email verification ──────────────────────────────────────
      if (DB_TYPE === 'firebase' && auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          await sendEmailVerification(userCredential.user, {
            url: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
          })
          await auth.signOut()
          console.info(t('console.firebaseVerificationSent'))
          setTimeout(() => router.push('/signin'), 2000)
        } catch {
          console.info(t('console.firebaseVerificationFailed'))
        }
      }

      // ── Supabase email verification ──────────────────────────────────────
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
          await supabase.auth.signOut()
          setTimeout(() => router.push('/signin'), 2000)
        } catch (supabaseErr: any) {
          setError(supabaseErr.message || t('errors.supabaseSignupFailed'))
        }
      }

      setTimeout(() => router.push('/signin'), 2000)

    } catch (err: any) {
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
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <form
        className={CARD}
        onSubmit={(e) => {
          e.preventDefault()
          if (!loading) handleSignup()
        }}
      >

        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertTitle>{t('alerts.errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <div className="mt-5 flex gap-3 rounded-lg border border-neutral-300 bg-neutral-100 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-black" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">{t('alerts.successTitle')}</p>
              <p className="mt-0.5 text-sm text-neutral-600">{successMsg}</p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-5">

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium text-neutral-800">
              {t('fields.fullName')}
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder={t('fields.fullNamePlaceholder')}
                value={full_name}
                onChange={(e) => setFullName(e.target.value)}
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
          </div>

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
                placeholder={t('fields.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-neutral-800">
              {t('fields.password')}
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
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
              {t('button.creating')}
            </span>
          ) : (
            t('button.signUp')
          )}
        </Button>

        <p className="mt-6 border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600">
          {t('links.alreadyHaveAccount')}{' '}
          <Link
            href="/signin"
            className="font-medium text-black underline-offset-4 hover:underline"
          >
            {t('links.loginNow')}
          </Link>
        </p>

      </form>
    </AuthShell>
  )
}