'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.substring(1))

    const token = params.get('access_token')
    const refresh = params.get('refresh_token')
    const type = params.get('type')

    if (token && refresh && type === 'recovery') {
      setAccessToken(token)
      setRefreshToken(refresh)

      supabase.auth.setSession({
        access_token: token,
        refresh_token: refresh,
      }).then(({ error }) => {
        if (error) setError('Could not restore session: ' + error.message)
      })
    } else {
      setError('Invalid or missing token.')
    }
  }, [])

  const handleReset = async () => {
    if (!password) return setError('Please enter a new password.')

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
    router.push('/signin')
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