'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useInstallerStore } from '../../store/useInstallerStore'
import { Loader2 } from 'lucide-react'

export default function AdminSetupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [nameError, setNameError] = useState('')
  const [EmailError, setEmailError] = useState('')
  const [PassError, setPassError] = useState('')
  
  const { setInstallerValue } = useInstallerStore()

  const isValidPassword = (pwd: string) => {
  const minLength = /.{8,}/
  const hasUpperCase = /[A-Z]/
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/

  return minLength.test(pwd) && hasUpperCase.test(pwd) && hasSymbol.test(pwd)
}
  
    const handleContinue = useCallback(() => {
      let hasError = false
  
      if (!fullName.trim()) {
        setNameError('Full name is required')
        hasError = true
      } else {
        setNameError('')
      }
  
      if (!email.trim()) {
        setEmailError('Email is required')
        hasError = true
      } else {
        setEmailError('')
      }

      if (!password.trim()  || !isValidPassword(password)) {
        setPassError('Password is required | Passowrd must be 8 characters long | Must Contain a Capital letter | Must contain a special character (e.g !@#$%^&*)')
        hasError = true
      } else {
        setPassError('')
      }
  
      if (hasError) return
  
      setLoading(true)
      setInstallerValue('adminUser', {fullName,email,password})
     
  
      setTimeout(() => {
        router.push('/installer/config')
      }, 500)
    }, [fullName, email,password ,setInstallerValue, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-6">
      {/* Logo and Tagline */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-black tracking-tight">🚀 NXT_Flutter</h1>
        <p className="text-xl text-gray-700 mt-2">Build once. Run anywhere.</p>
      </header>

      {/* Card */}
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-50 rounded-2xl shadow-xl border">
        <h2 className="text-3xl font-bold text-gray-900 text-center">Admin User Setup</h2>
        <p className="text-center text-gray-600 text-sm mb-6">
          Please provide the admin user details to secure your NXT_Flutter system. This account will have full administrative access within the platform.
        </p>

        <div className="space-y-4 text-left">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <Input
              id="fullName"
              placeholder="e.g., John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            {nameError && <p className="text-sm text-red-500 mt-1">{nameError}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {EmailError && <p className="text-sm text-red-500 mt-1">{EmailError}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Create a secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
              {PassError && <p className="text-sm text-red-500 mt-1">{PassError}</p>}

          </div>
        </div>

        <p className="text-xs text-gray-500 italic text-center mt-2">
          Please note: This creates an admin account on the NXT_Flutter system and may be different from your database admin account.
        </p>

        <div className="pt-4">
           <Button className="w-full" onClick={handleContinue} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Continue'
              )}
            </Button>
        </div>
      </div>
    </div>
  )
}
