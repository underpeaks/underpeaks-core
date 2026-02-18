'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock, FiUser } from 'react-icons/fi'

export default function SignUpPage() {
  const router = useRouter()

  const [full_name, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function handleSignup() {
    setError(null)
    setSuccessMsg(null)

    if (!full_name.trim()) return setError('Full name is required')
    if (!email.trim()) return setError('Email is required')
    if (!password.trim()) return setError('Password is required')

    setLoading(true)

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, password }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)

      setSuccessMsg('Account created! Please check your email to verify your account.')
      setTimeout(() => router.push('/signin'), 2000)
    } catch (err: any) {
      setError(err.message || 'Signup failed')
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

        {successMsg && (
          <Alert variant="default" className="mb-4">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <Label htmlFor="fullName" className="mb-1 text-black">Full Name</Label>
        <div className="flex items-center gap-2 mb-4">
          <FiUser className="text-gray-500" />
          <Input id="fullName" type="text" placeholder="Your full name" value={full_name} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <Label htmlFor="email" className="mb-1 text-black">Email</Label>
        <div className="flex items-center gap-2 mb-4">
          <FiMail className="text-gray-500" />
          <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <Label htmlFor="password" className="mb-1 text-black">Password</Label>
        <div className="flex items-center gap-2 mb-6">
          <FiLock className="text-gray-500" />
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Button className="w-full mb-4" onClick={handleSignup} disabled={loading}>
          {loading ? 'Creating...' : 'Sign Up'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/signin" className="text-blue-600 hover:underline">Login now</Link>
        </p>
      </div>
    </div>
  )
}
