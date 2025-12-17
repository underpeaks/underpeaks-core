'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FiMail } from 'react-icons/fi'
import { DBAdapter, DBConfig } from '@/app/db-adapter/types'

interface ForgotPasswordProps {
  adapter: DBAdapter
  config: DBConfig
}

export default function ForgotPasswordPage({ adapter, config }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { forgotPassword } = await import('@/app//(auth)/forgot-password/actions/forgot-password')
      const result = await forgotPassword({ email, adapter, config })

      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      console.error(err)
      setError('Failed to send reset email. Please try again.')
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

        {success ? (
          <Alert variant="default" className="mb-4">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              A password reset link has been sent to your email.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Label htmlFor="email" className="text-black mb-1">
              Email address
            </Label>
            <div className="relative mb-4">
              <FiMail className="absolute left-3 top-3 text-gray-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
