'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useInstallerStore } from '../../../store/useInstallerStore'
import { Loader2 } from 'lucide-react'
import LocaleSwitcher from '@/core/LocaleSwitcher'

export default function ProjectInfoPage() {
  const router = useRouter()
  const { setInstallerValue } = useInstallerStore()

  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('console')
  const [domain, setDomain] = useState('http://localhost:3000')
  const [loading, setLoading] = useState(false)

  const [nameError, setNameError] = useState('')
  const [subdomainError, setSubdomainError] = useState('')
  const [domainError, setDomainError] = useState('')

  const handleContinue = useCallback(() => {
    let hasError = false

    if (!name.trim()) {
      setNameError('Project name is required')
      hasError = true
    } else setNameError('')

    if (!subdomain.trim()) {
      setSubdomainError('Subdomain is required')
      hasError = true
    } else setSubdomainError('')

    if (!domain.trim()) {
      setDomainError('Domain is required')
      hasError = true
    } else setDomainError('')

    if (hasError) return

    setLoading(true)
    setInstallerValue('projectName', name)
    setInstallerValue('subdomain', subdomain)
    setInstallerValue('domain', domain)

    setTimeout(() => {
      router.push('/installer/admin')
    }, 500)
  }, [name, subdomain, domain, setInstallerValue, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">
      {/* Locale switcher — top right */}
            <div className="fixed top-4 right-4 z-50">
              <LocaleSwitcher />
            </div>
      {/* Header */}
       <header className="mb-8 text-center flex flex-col items-center">
  <img 
    src="/images/logo/NXT_Flutter_logo.png" 
    alt="NXT_Flutter Logo" 
    className="h-16 w-auto mb-4"
  />
  <p className="text-xl text-gray-700">Your All-in-One SaaS Installer & Code Generator</p>
</header>


      {/* Form Card */}
      <div className="w-full max-w-md space-y-6 p-6 sm:p-8 bg-gray-50 rounded-2xl shadow-xl border text-center">
       <h2 className="text-3xl font-bold text-gray-900 text-center">Project Setup</h2>
        <p className="text-sm text-gray-600">
          Enter project name, subdomain, and domain for your self-hosted studio.
        </p>

        <div className="space-y-4 text-left">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <Input
              placeholder="e.g., MyApp Studio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={nameError ? 'border-red-500' : ''}
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>
           {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Domain</label>
            <Input
              placeholder="e.g., http://localhost:3000"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={domainError ? 'border-red-500' : ''}
            />
            {domainError && <p className="text-xs text-red-500 mt-1">{domainError}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Full domain for your app. Default is <code>localhost:3000</code>.
            </p>
          </div>
      

          {/* Subdomain */}
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
         

        {/* Continue Button */}
        <div className="pt-2">
          <Button className="w-full" onClick={handleContinue} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
