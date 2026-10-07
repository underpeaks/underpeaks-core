// File: app/[locale]/reset-password/page.tsx
'use client'

import { useState, useEffect, Suspense }        from 'react'
import { useSearchParams }                      from 'next/navigation'
import Link                                     from 'next/link'
import { Input }                                from '@/components/ui/input'
import { Button }                               from '@/components/ui/button'
import { Label }                                from '@/components/ui/label'
import { Alert, AlertDescription }              from '@/components/ui/alert'
import { Lock, Loader2, CheckCircle2 }          from 'lucide-react'
import AuthShell                                from '@/core/AuthShell'
import { CARD, PRIMARY_BUTTON, INPUT_CLASS }    from '@/core/InstallerShell'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [status,   setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message,  setMessage]  = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No reset token provided. Please use the link from your email.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirm) {
      setStatus('error')
      setMessage('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/auth-reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      setMessage('Your password has been reset. You can now sign in.')
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const disabled = status === 'loading' || !token

  return (
    <AuthShell>
      <div className={CARD}>

        {status === 'success' ? (
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Password reset</h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{message}</p>
            <Link
              href="/signin"
              className={`${PRIMARY_BUTTON} mt-6 inline-flex w-full items-center justify-center`}
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
            <p className="mt-1 text-sm text-neutral-500">Enter your new password below.</p>

            {message && status === 'error' && (
              <Alert variant="destructive" className="mt-5">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 space-y-5">

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-sm font-medium text-neutral-800">
                  New password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={disabled}
                    className={`${INPUT_CLASS} pl-9`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-800">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={disabled}
                    className={`${INPUT_CLASS} pl-9`}
                  />
                </div>
              </div>

            </div>

            <Button type="submit" disabled={disabled} className={`${PRIMARY_BUTTON} mt-7 w-full`}>
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting…
                </span>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        )}

      </div>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}