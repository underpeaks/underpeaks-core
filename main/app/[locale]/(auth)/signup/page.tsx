'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { FiMail, FiLock, FiUser } from 'react-icons/fi'

// Firebase client SDK
import { initializeApp, getApps } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'

// Supabase client
import { createClient } from '@supabase/supabase-js'

// ✅ Detect DB type FIRST
const DB_TYPE = process.env.NEXT_PUBLIC_DB_TYPE

// ---------------- SAFE INITIALIZATION ----------------
let auth: any = null
let supabase: any = null

// ✅ Firebase only if needed
if (DB_TYPE === 'firebase' && process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
  const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG)
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  auth = getAuth(app)
}

// ✅ Supabase only if needed (FIXED HARD GUARD)
if (
  DB_TYPE === 'supabase' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  )

  console.log(supabase);

} else if (DB_TYPE === 'supabase') {
  console.error('❌ Supabase env vars missing')
}

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
      // ---------------- API CALL ----------------
       console.log('I REACH HERE6');
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, password }),
      }).then(r => r.json())

      if (res.error) throw new Error(res.error)

      console.log(res)
      setSuccessMsg('Account created successfully!')

      // ---------------- FIREBASE FLOW ----------------
      if (DB_TYPE === 'firebase' && auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)

          await sendEmailVerification(userCredential.user, {
            url: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
          })

          await auth.signOut()

          console.log('✅ Firebase verification email sent')
          setTimeout(() => router.push('/signin'), 2000)
        } catch (firebaseErr: any) {
          console.error('❌ Firebase email verification failed:', firebaseErr)
        }
      }

      // ---------------- SUPABASE FLOW ----------------
      if (DB_TYPE === 'supabase' && supabase) {
         console.log('I REACH HERE 5');
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name },
              emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
            },
          })

          if (error) throw error

          console.log('✅ Supabase signup success:', data)

          await supabase.auth.signOut()

          console.log('📧 Supabase verification email sent')

          setTimeout(() => router.push('/signin'), 2000)
        } catch (supabaseErr: any) {
          console.error('❌ Supabase signup failed:', supabaseErr)
          setError(supabaseErr.message || 'Supabase signup failed')
        }
      }

      // fallback redirect
      setTimeout(() => router.push('/signin'), 2000)

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Try logging in instead.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Minimum 6 characters.')
      } else {
        setError(err.message || 'Signup failed')
      }
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