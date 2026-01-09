'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock } from 'react-icons/fi'
import { signin } from './actions/signin'

// 🔹 Correct import path for client Firebase service
import { getFirebaseAuth } from '@/app/lib/firebase-service'
import { signInWithEmailAndPassword } from 'firebase/auth'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get('redirectedFrom') || '/console'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignin() {
    setLoading(true)
    setError(null)

    // STEP 1: Standard email/password signin (server-side)
    const result = await signin({ email, password })

    // STEP 2: If missing token, use Firebase client login
    if (result?.error === 'Missing authentication token') {
      try {
        const auth = await getFirebaseAuth()
        const cred = await signInWithEmailAndPassword(auth, email, password)
        const token = await cred.user.getIdToken()

        // Retry server signin with Firebase token
        const tokenResult = await signin({ token })

        if (tokenResult?.error) {
          setError(tokenResult.error)
          setLoading(false)
          return
        }
      } catch (err: any) {
        console.error('Firebase client login failed:', err)
        setError(err.message || 'Authentication failed')
        setLoading(false)
        return
      }
    } else if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // ✅ Success
    router.refresh()
    setTimeout(() => {
      router.push(redirectedFrom)
    }, 300)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-black mb-6">
          Sign in to Your NxtFlutter Account
        </h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Label htmlFor="email" className="mb-1 text-black">
          Email
        </Label>
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

        <Label htmlFor="password" className="mb-1 text-black">
          Password
        </Label>
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

        <p className="mb-4 text-right text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </p>

        <Button
          className="w-full mb-4"
          onClick={handleSignin}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  )
}
