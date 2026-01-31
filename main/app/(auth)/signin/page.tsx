'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock } from 'react-icons/fi'

// Server route
const API_SIGNIN_ROUTE = '/api/signin'

// Firebase client
import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, type Auth } from 'firebase/auth'

export default function SignInPageWrapper() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  )
}

function SignInPage() {
  const router = useRouter()
  const redirectedFrom =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('redirectedFrom') || '/console'
      : '/console'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Firebase client
  let clientApp: ReturnType<typeof initializeApp> | undefined
  let clientAuth: Auth | undefined
  if (typeof window !== 'undefined') {
    if (getApps().length > 0) {
      clientApp = getApps()[0]
    }
  }

  async function handleSignin() {
    setLoading(true)
    setError(null)

    try {
      // Step 1: server login
      let result = await fetch(API_SIGNIN_ROUTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then((res) => res.json())

      // Step 2: if DB is Firebase, fallback to client login
      if (result?.error === 'Email/password login not supported for DB type: firebase') {
        // 🔹 Use client-side env config
        if (!clientApp) {
          const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!)
          clientApp = initializeApp(firebaseConfig)
        }
        if (!clientAuth) clientAuth = getAuth(clientApp)

        // Sign in via Firebase client SDK
        const cred = await signInWithEmailAndPassword(clientAuth, email, password)
        const token = await cred.user.getIdToken()

        // ✅ Save token for ConsoleLayout
        localStorage.setItem('authToken', token)

        // Validate token with server
        result = await fetch(API_SIGNIN_ROUTE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).then((res) => res.json())

        if (result?.error) throw new Error(result.error)
      } else if (result?.error) {
        throw new Error(result.error)
      }

      // ✅ Success — redirect
      router.replace(redirectedFrom)
    } catch (err: any) {
      console.error('Signin error:', err)
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
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
