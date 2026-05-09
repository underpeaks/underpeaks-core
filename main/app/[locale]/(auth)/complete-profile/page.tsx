// CompleteProfilePage.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ClipLoader } from 'react-spinners'
import type { DBAdapter, DBConfig } from '@/app/db-adapter/types'

interface Props {
  dbAdapter: DBAdapter
  dbConfig: DBConfig
  userEmail: string
}

export default function CompleteProfilePage({ dbAdapter, dbConfig, userEmail }: Props) {
  const [subdomain, setSubdomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [tenantExists, setTenantExists] = useState<boolean | null>(null)

  const router = useRouter()

  useEffect(() => {
    const checkTenant = async () => {
      if (!dbAdapter.findTenantByUserEmail) {
        console.warn('findTenantByUserEmail not implemented in adapter')
        setTenantExists(false)
        return
      }

      try {
        const tenant = await dbAdapter.findTenantByUserEmail(dbConfig, userEmail)
        setTenantExists(!!tenant)
        if (tenant) router.push('/console')
      } catch (err) {
        console.error('Error checking tenant:', err)
        setTenantExists(false)
      }
    }

    checkTenant()
  }, [dbAdapter, dbConfig, userEmail, router])

  const handleSubmit = async () => {
    if (!subdomain) return alert('Please enter a subdomain')
    if (!dbAdapter.createTenant) return alert('Adapter does not support createTenant')

    setLoading(true)
    try {
      await dbAdapter.createTenant(dbConfig, { subdomain, user_email: userEmail })
      router.push('/console')
    } catch (err: any) {
      alert('Error saving subdomain: ' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  if (tenantExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <ClipLoader color="#4B5563" size={48} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <Card className="w-full max-w-md bg-white shadow-md border border-gray-300">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-2 text-center text-black">
            Complete Your Profile
          </h1>
          <p className="text-sm text-gray-700 mb-6 text-center">
            Welcome, <strong>{userEmail}</strong>!
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
        </CardContent>
      </Card>
    </div>
  )
}
