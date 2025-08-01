'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock, FiUser } from 'react-icons/fi'
import { signup } from './actions/signup'

export default function SignUpPage() {
  const router = useRouter()

  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignup() {
    setLoading(true)
    setError(null)

    try {
      const result = await signup({
        full_name,
        email,
        password,
        // ❗ Placeholder: Replace with actual tenant ID later
        tenant_id: null
      })

      if ('error' in result) {
        setError(result.error ?? 'Error')
        setLoading(false)
        return
      }

      router.push('/signin')
    } catch {
      setError('Unexpected error, please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-black mb-6">
          Create Your NxtFlutter Account
        </h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Label htmlFor="fullName" className="mb-1 text-black">Full Name</Label>
        <div className="flex items-center gap-2 mb-4">
          <FiUser className="text-gray-500" />
          <Input
            id="fullName"
            type="text"
            placeholder="Your full name"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <Label htmlFor="email" className="mb-1 text-black">Email</Label>
        <div className="flex items-center gap-2 mb-4">
          <FiMail className="text-gray-500" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Label htmlFor="password" className="mb-1 text-black">Password</Label>
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

        <Button
          className="w-full mb-4"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Sign Up'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/signin" className="text-blue-600 hover:underline">
            Login now
          </Link>
        </p>
      </div>
    </div>
  )
}
