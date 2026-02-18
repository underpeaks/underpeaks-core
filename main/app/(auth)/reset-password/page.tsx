'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenExpired, setTokenExpired] = useState(false)

  useEffect(() => {
    const t = searchParams.get('token')
    if (!t) {
      setError('Invalid or missing reset link.')
      return
    }
    setToken(t)
  }, [searchParams])

  const handleReset = async () => {
    if (!password) return setError('Please enter a new password.')
    if (!token) return setError('Missing reset token.')

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error?.toLowerCase().includes('expired')) {
          setTokenExpired(true)
          setTimeout(() => router.push('/forgot-password'), 3000)
        } else {
          throw new Error(data.error || 'Failed to reset password.')
        }
        return
      }

      setSubmitted(true)
      setTimeout(() => router.push('/signin'), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (tokenExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md border border-gray-200 bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Reset Link Expired</h1>
          <p className="text-gray-600">
            Your password reset link has expired. Redirecting you to the forgot password page...
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md border border-gray-200 bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-black mb-4">Password Reset Successful</h1>
          <p className="text-gray-600">
            You can now{' '}
            <a href="/signin" className="text-black font-medium underline">
              sign in
            </a>{' '}
            with your new password.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-black mb-6">Reset Password</h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Label htmlFor="password" className="text-black mb-1">
          New Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />

        <Button onClick={handleReset} disabled={loading || !token} className="w-full">
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </div>
    </div>
  )
}
