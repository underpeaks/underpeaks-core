'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FiMail } from 'react-icons/fi'

// Firebase imports (client only)
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, sendPasswordResetEmail } from 'firebase/auth'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const emailInputRef = useRef<HTMLInputElement>(null)
  const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

  useEffect(() => {
    // Auto-focus the email input on page load
    emailInputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Scroll email input into view if error occurs
    if (error) emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  function getFirebaseAuth() {
    const configStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
    if (!configStr) throw new Error('Firebase config missing')

    const firebaseConfig = JSON.parse(configStr)
    if (!getApps().length) initializeApp(firebaseConfig)
    return getAuth()
  }

  const handleNoticeOk = () => router.push('/signin')

  const handleSubmit = async () => {
    if (!email) return setError('Please enter your email address.')
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
      } else {
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Failed to send reset link')

        // If admin-handled notice
        if (data.notice) setNotice(data.notice)
        else setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-black mb-4">Forgot Password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        {notice && (
          <Alert variant="default" className="mb-4 flex flex-col gap-4">
            <div>
              <AlertTitle>Request Submitted</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </div>
            <Button onClick={handleNoticeOk} className="w-full mt-2">OK</Button>
          </Alert>
        )}

        {success && !notice && (
          <Alert variant="default" className="mb-4 flex flex-col gap-4">
            <div>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                A password reset email has been sent. Check your inbox. Redirecting to login...
              </AlertDescription>
            </div>
            <Button onClick={() => router.push('/signin')} className="w-full mt-2">OK</Button>
          </Alert>
        )}

        {!success && !notice && (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Label htmlFor="email" className="text-black mb-1">Email address</Label>
            <div className="relative mb-4">
              <FiMail className="absolute left-3 top-3 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                ref={emailInputRef}
              />
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
