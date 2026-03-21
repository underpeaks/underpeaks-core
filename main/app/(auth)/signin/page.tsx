'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock } from 'react-icons/fi'

// Firebase SDK
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'

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

  async function handleSignin() {
    setLoading(true)
    setError(null)

    try {
      const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE
      if (!DB_TYPE) throw new Error('NEXT_PUBLIC_DB_TYPE is not set')

      let bodyPayload: any = { email, password, userAgent: navigator.userAgent }

      // 🔥 FIREBASE LOGIN
      if (DB_TYPE === 'firebase') {
        if (!getApps().length) {
          const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!)
          initializeApp(firebaseConfig)
        }

        const auth = getAuth()
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const idToken = await userCredential.user.getIdToken()

        const res = await fetch('/api/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ email, idToken, userAgent: navigator.userAgent }),
        })

        const data = await res.json()
        console.log('[FIREBASE SIGNIN RESPONSE]', data)

        if (!res.ok || !data.success) throw new Error(data.error || 'Signin failed')
        localStorage.setItem('authToken', data.accessToken)
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      }

      // 🔥 SUPABASE FIXED
      else if (DB_TYPE === 'supabase') {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, anonKey)

        // Call Supabase sign-in via API route
        const res = await fetch('/api/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await res.json()
        console.log('[SUPABASE SIGNIN RESPONSE]', data)

        if (!res.ok || !data.success) throw new Error(data.error || 'Signin failed')

        // Save tokens
        localStorage.setItem('authToken', data.accessToken)
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      }

      // 🔹 MONGO / SQL CUSTOM LOGIN
      else {
        const res = await fetch('/api/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        })

        const data = await res.json()
        console.log('[CUSTOM SIGNIN RESPONSE]', data)

        if (!res.ok || !data.success || !data.accessToken) {
          throw new Error(data.error || 'Signin failed')
        }
        localStorage.setItem('authToken', data.accessToken)
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
      }

      await router.replace(redirectedFrom)
    } catch (err: any) {
      console.error('Signin error:', err)
      setError(err.message || 'Authentication failed')
    } finally {
      setTimeout(() => setLoading(false), 300)
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <p className="mb-4 text-right text-sm">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </p>

        <Button className="w-full mb-4" onClick={handleSignin} disabled={loading}>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Signing in...
            </div>
          ) : (
            'Sign In'
          )}
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
