// ForgotPasswordPage.tsx  (app/[locale]/forgot-password/page.tsx)
'use client'

import { useState, useRef, useEffect }           from 'react'
import { useRouter }                             from 'next/navigation'
import { useTranslations }                       from 'next-intl'
import { Input }                                 from '@/components/ui/input'
import { Button }                                from '@/components/ui/button'
import { Label }                                 from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle }   from '@/components/ui/alert'
import { Mail, Loader2, CheckCircle2 }           from 'lucide-react'
import { initializeApp, getApps }                from 'firebase/app'
import { getAuth, sendPasswordResetEmail }       from 'firebase/auth'
import { logActivity }                           from '@/app/lib/logActivity'
import AuthShell                                 from '@/core/AuthShell'
import { CARD, PRIMARY_BUTTON, INPUT_CLASS }     from '@/core/InstallerShell'

export default function ForgotPasswordPage() {
  const router  = useRouter()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [notice,  setNotice]  = useState<string | null>(null)
  const emailInputRef         = useRef<HTMLInputElement>(null)
  const DB_TYPE               = process.env.NEXT_PUBLIC_DB_TYPE
  const t                     = useTranslations('forgotPassword')

  useEffect(() => { emailInputRef.current?.focus() }, [])
  useEffect(() => {
    if (error) emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  function getFirebaseAuth() {
    const configStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
    if (!configStr) throw new Error(t('errors.firebaseConfigMissing'))
    const firebaseConfig = JSON.parse(configStr)
    if (!getApps().length) initializeApp(firebaseConfig)
    return getAuth()
  }

  const handleNoticeOk = () => router.push('/signin')

  const handleSubmit = async () => {
    if (!email) return setError(t('validation.emailRequired'))

    setLoading(true)
    setError(null)
    setSuccess(false)
    setNotice(null)

    try {
      if (DB_TYPE === 'firebase') {
        const auth = getFirebaseAuth()
        await sendPasswordResetEmail(auth, email, {
          url: `${window.location.origin}/signin`,
        })
        setSuccess(true)

        // No user_id available at this point — log with email in context only.
        // The activity log route requires user_id so we skip it here and rely
        // on the server-side /api/forgot-password to log it when applicable.

      } else {
        const res  = await fetch('/api/forgot-password', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || t('errors.sendFailed'))

        // Log if the server returned a user_id alongside the response
        if (data.user_id) {
          await logActivity(data.user_id, 'password_reset_requested', { email })
        }

        if (data.notice) {
          setNotice(data.notice)
        } else {
          setSuccess(true)
        }
      }
    } catch (err: any) {
      setError(err.message || t('errors.sendFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className={CARD}>

        {/* Notice (server message) */}
        {notice && (
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">{t('notice.title')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{notice}</p>
            <Button onClick={handleNoticeOk} className={`${PRIMARY_BUTTON} mt-6 w-full`}>
              {t('notice.button')}
            </Button>
          </div>
        )}

        {/* Success */}
        {success && !notice && (
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">{t('success.title')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{t('success.description')}</p>
            <Button onClick={() => router.push('/signin')} className={`${PRIMARY_BUTTON} mt-6 w-full`}>
              {t('success.button')}
            </Button>
          </div>
        )}

        {/* Form */}
        {!success && !notice && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!loading) handleSubmit()
            }}
          >
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t('description')}</p>

            {error && (
              <Alert variant="destructive" className="mt-5">
                <AlertTitle>{t('error.title')}</AlertTitle>
                <AlertDescription id="email-error">{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-neutral-800">
                {t('form.emailLabel')}
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('form.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${INPUT_CLASS} pl-9`}
                  ref={emailInputRef}
                  aria-describedby={error ? 'email-error' : undefined}
                />
              </div>
            </div>

            <Button type="submit" disabled={loading} className={`${PRIMARY_BUTTON} mt-6 w-full`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('form.buttonSending')}
                </span>
              ) : (
                t('form.buttonSend')
              )}
            </Button>
          </form>
        )}

      </div>
    </AuthShell>
  )
}