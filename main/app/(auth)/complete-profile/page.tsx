'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ClipLoader } from 'react-spinners';




export default function CompleteProfilePage() {
  const [subdomain, setSubdomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [tenantExists, setTenantExists] = useState<boolean | null>(null) // null = checking

  const router = useRouter()

  // useEffect(() => {
  //   const checkUserAndTenant = async () => {
  //     const {
  //       data: { user },
  //     } = await supabase.auth.getUser()

  //     const email = user?.email?.trim().toLowerCase()

  //     if (!email) {
  //       setStatus('unauthenticated')
  //       return
  //     }

  //     setUserEmail(email)
  //     setStatus('authenticated')

  //     // Check if tenant exists
  //     const { data: tenant } = await supabase
  //       .from('tenants')
  //       .select('id')
  //       .eq('user_email', email)
  //       .maybeSingle()

  //     if (tenant) {
  //       router.push('/console')
  //     } else {
  //       setTenantExists(false)
  //     }
  //   }

  //   checkUserAndTenant()
  // }, [router])

  // useEffect(() => {
  //   if (status === 'unauthenticated') {
  //     router.push('/login')
  //   }
  // }, [status, router])

  const handleSubmit = async () => {
  //   if (!subdomain) return alert('Please enter a subdomain')
  //   setLoading(true)

  //   try {
  //     const { data: sessionData } = await supabase.auth.getSession()
  //     const accessToken = sessionData?.session?.access_token

  //     const res = await fetch('/api/user/set-subdomain', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //       body: JSON.stringify({ subdomain }),
  //     })

  //     if (!res.ok) {
  //       const errorData = await res.json().catch(() => ({}))
  //       throw new Error(errorData.error || 'Failed to save subdomain')
  //     }

  //     router.push('/console')
  //   } catch (err) {
  //     alert('Error saving subdomain: ' + (err instanceof Error ? err.message : String(err)))
  //   } finally {
  //     setLoading(false)
  //   }
  }

  // const handleLogout = async () => {
  //   await supabase.auth.signOut()
  //   router.push('/login')
  // }

  // Show spinner while checking tenant
  if (status === 'loading' || tenantExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <ClipLoader color="#4B5563" size={48} />
      </div>
    )
  }

  // Only show form if authenticated AND no tenant
  if (status === 'authenticated' && tenantExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <Card className="w-full max-w-md bg-white shadow-md border border-gray-300">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-2 text-center text-black">
              Complete Your Profile
            </h1>
            <p className="text-sm text-gray-700 mb-6 text-center">
              Welcome, <strong>{userEmail || 'user'}</strong>!
            </p>

            <div className="mb-4">
              <Label htmlFor="subdomain" className="text-gray-700 mb-1 block">
                Choose a subdomain
              </Label>
              <div className="flex items-center rounded border border-gray-300 px-3 py-2 bg-white">
                <Input
                  id="subdomain"
                  placeholder="yourapp"
                  className="border-none p-0 shadow-none text-black"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.trim())}
                />
                <span className="ml-2 text-sm text-gray-500">.nextflutter.com</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your app will be accessible at{' '}
                <span className="font-medium">https://{subdomain || 'yourapp'}.nextflutter.com</span>
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-black text-white hover:bg-gray-900"
            >
              {loading ? 'Saving...' : 'Save & Continue'}
            </Button>

            {/* <Button
              variant="ghost"
              onClick={handleLogout}
              className="mt-4 w-full text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </Button> */}
          </CardContent>
        </Card>
      </div>
    )
  }

  // If none of above, return null (to avoid flicker)
  return null
}