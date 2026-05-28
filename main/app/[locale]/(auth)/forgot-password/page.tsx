'use client'

import { useState, useRef, useEffect }       from 'react'
import { useRouter }                         from 'next/navigation'
import { useTranslations }                   from 'next-intl'
import { Input }                             from '@/components/ui/input'
import { Button }                            from '@/components/ui/button'
import { Label }                             from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FiMail }                            from 'react-icons/fi'
import { initializeApp, getApps }            from 'firebase/app'
import { getAuth, sendPasswordResetEmail }   from 'firebase/auth'
import { logActivity }                       from '@/app/lib/logActivity'

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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">

        <h1 className="text-2xl font-bold text-black mb-4">{t('title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('description')}</p>

        {notice && (
          <Alert variant="default" className="mb-4 flex flex-col gap-4">
            <div>
              <AlertTitle>{t('notice.title')}</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </div>
            <Button onClick={handleNoticeOk} className="w-full mt-2">{t('notice.button')}</Button>
          </Alert>
        )}

        {success && !notice && (
          <Alert variant="default" className="mb-4 flex flex-col gap-4">
            <div>
              <AlertTitle>{t('success.title')}</AlertTitle>
              <AlertDescription>{t('success.description')}</AlertDescription>
            </div>
            <Button onClick={() => router.push('/signin')} className="w-full mt-2">
              {t('success.button')}
            </Button>
          </Alert>
        )}

        {!success && !notice && (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>{t('error.title')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Label htmlFor="email" className="text-black mb-1">{t('form.emailLabel')}</Label>
            <div className="relative mb-4">
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
            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? t('form.buttonSending') : t('form.buttonSend')}
            </Button>
          </>
        )}

      </div>
    </div>
  )
}