'use client'

import { useState }                                          from 'react'
import { useRouter }                                         from 'next/navigation'
import Link                                                  from 'next/link'
import { Input }                                             from '@/components/ui/input'
import { Button }                                            from '@/components/ui/button'
import { Label }                                             from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription }               from '@/components/ui/alert'
import { FiMail, FiLock, FiUser }                            from 'react-icons/fi'
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

const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

let auth: any     = null
let supabase: any = null

if (DB_TYPE === 'firebase' && process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
  const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
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

  const [full_name,   setFullName]   = useState('')
  const [email,       setEmail]      = useState('')
  const [password,    setPassword]   = useState('')
  const [loading,     setLoading]    = useState(false)
  const [error,       setError]      = useState<string | null>(null)
  const [successMsg,  setSuccessMsg] = useState<string | null>(null)

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

      // Log signup — use the user_id returned by the API if available
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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">

        <h1 className="text-2xl font-bold text-black mb-6">{t('heading')}</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t('alerts.errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert variant="default" className="mb-4">
            <AlertTitle>{t('alerts.successTitle')}</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <Label htmlFor="fullName" className="mb-1 text-black">{t('fields.fullName')}</Label>
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

        <Label htmlFor="email" className="mb-1 text-black">{t('fields.email')}</Label>
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

        <Label htmlFor="password" className="mb-1 text-black">{t('fields.password')}</Label>
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

        <Button className="w-full mb-4" onClick={handleSignup} disabled={loading}>
          {loading ? t('button.creating') : t('button.signUp')}
        </Button>

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