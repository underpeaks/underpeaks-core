'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { DBAdapter, DBConfig } from '@/app/db-adapter/types'

interface ResetPasswordProps {
  adapter: DBAdapter
  config: DBConfig
}

export default function ResetPasswordPage({ adapter, config }: ResetPasswordProps) {
  const router = useRouter()

  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const resetToken = params.get('token')
    if (resetToken) setToken(resetToken)
    else setError('Invalid or missing token.')
  }, [])

  const handleReset = async () => {
    if (!password) return setError('Please enter a new password.')
    if (!token) return setError('Missing reset token.')

    setLoading(true)
    setError(null)

    try {
      const { resetPassword } = await import('@/app/(auth)/reset-password/actions/reset-password')
      const result = await resetPassword({ token, newPassword: password, adapter, config })

      if (result.error) {
        setError(result.error)
      } else {
        setSubmitted(true)
        setTimeout(() => router.push('/signin'), 2000)
      }
    } catch (err: any) {
      console.error(err)
      setError('Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
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

        <Button
          onClick={handleReset}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </div>
    </div>
  )
}
