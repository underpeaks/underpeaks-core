'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useInstallerStore } from '../../store/useInstallerStore'
import { Loader2 } from 'lucide-react'

export default function ProjectInfoPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('console')
  const [loading, setLoading] = useState(false)

  const [nameError, setNameError] = useState('')
  const [subdomainError, setSubdomainError] = useState('')

  const { setInstallerValue } = useInstallerStore()

  const handleContinue = useCallback(() => {
    let hasError = false

    if (!name.trim()) {
      setNameError('Project name is required')
      hasError = true
    } else {
      setNameError('')
    }

    if (!subdomain.trim()) {
      setSubdomainError('Subdomain is required')
      hasError = true
    } else {
      setSubdomainError('')
    }

    if (hasError) return

    setLoading(true)
    setInstallerValue('projectName', name)
    setInstallerValue('subdomain', subdomain)

    setTimeout(() => {
      router.push('/installer/admin')
    }, 500)
  }, [name, subdomain, setInstallerValue, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-black tracking-tight">🚀 NXT_Flutter</h1>
        <p className="text-xl text-gray-700 mt-2">Build once. Run anywhere.</p>
      </header>

      <div className="w-full max-w-md space-y-6 p-6 sm:p-8 bg-gray-50 rounded-2xl shadow-xl border text-center">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Project Setup</h2>
            <p className="text-sm text-gray-600">
              Please enter a project name and choose a subdomain for your self-hosted studio.
            </p>
          </div>

          <div className="space-y-4 text-left">
            {/* Project Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Name</label>
              <Input
                placeholder="e.g., MyApp Studio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={nameError ? 'border-red-500' : ''}
              />
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
              <p className="text-xs text-gray-500 mt-1">
                This name will appear in your admin dashboard.
              </p>
            </div>

            {/* Subdomain Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Subdomain</label>
              <Input
                placeholder="e.g., console"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className={subdomainError ? 'border-red-500' : ''}
              />
              {subdomainError && <p className="text-xs text-red-500 mt-1">{subdomainError}</p>}
              <p className="text-xs text-gray-500 mt-1">
                This will be used for the URL: <code>{subdomain || 'console'}.yourdomain.com</code>
              </p>
            </div>
          </div>

          <div className="pt-2">
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
    </div>
  )
}
