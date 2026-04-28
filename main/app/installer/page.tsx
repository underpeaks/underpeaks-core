'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react' // optional spinner icon
import { Button } from '@/components/ui/button'

export default function WelcomePage() {
  const [accepted, setAccepted] = useState(false)
  const [licenseText, setLicenseText] = useState('')
  const [loading, setLoading] = useState(false) // ✅ loading state
  const router = useRouter()

  useEffect(() => {
    fetch('/license.txt')
      .then((res) => res.text())
      .then((text) => setLicenseText(text))
      .catch(() => setLicenseText('Failed to load license agreement.'))
  }, [])

  const handleContinue = () => {
    setLoading(true) // ✅ show spinner and disable button
    setTimeout(() => {
      router.push('/installer/project')
    }, 100) // tiny delay so spinner renders
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-12">
      {/* Header */}
     <header className="mb-8 text-center flex flex-col items-center">
  <img 
    src="/images/logo/NXT_Flutter_logo.png" 
    alt="NXT_Flutter Logo" 
    className="h-16 w-auto mb-4"
  />
  <p className="text-xl text-gray-700">Your All-in-One SaaS Installer & Code Generator</p>
</header>

      {/* Benefits */}
      <section className="max-w-3xl mx-auto text-gray-800 mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-center">Why NXT_Flutter?</h2>
        <ul className="list-disc pl-5 space-y-2 text-base">
          <li>🔧 Fullstack codebase generator (Next.js + Flutter)</li>
          <li>⚙️ No more boilerplate – just real production-ready code</li>
          <li>🌍 Multi-language and multi-tenant ready</li>
          <li>📦 Self-hosted or cloud-hosted – your choice</li>
          <li>🔐 Built-in auth, roles, permissions, installer UI</li>
          <li>💼 Ideal for startups, agencies, and enterprise projects</li>
        </ul>
      </section>

      {/* License Terms */}
      <section className="max-w-4xl mx-auto flex flex-col space-y-4 mb-8">
        <h3 className="text-xl font-semibold text-gray-900">License Agreement</h3>
        <div className="bg-gray-100 border border-gray-300 p-4 rounded max-h-72 overflow-y-auto text-sm text-black whitespace-pre-wrap">
          {licenseText || 'Loading license...'}
        </div>

        {/* Accept Terms */}
        <div className="flex justify-center items-center mt-4">
          <div className="flex items-center space-x-3 bg-white text-black px-4 py-2 rounded shadow-md">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={(val) => setAccepted(!!val)}
              className="border-black bg-white text-black"
            />
            <label htmlFor="accept" className="text-black font-medium">
              Accept the license terms.
            </label>
          </div>
        </div>
      </section>

      {/* Continue Button */}
      <div className="flex justify-end mt-auto max-w-6xl mx-auto">
  <Button 
    disabled={!accepted || loading} 
    onClick={handleContinue}
    className="px-8 py-6 text-lg"
  >
    {loading ? (
      <span className="flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading...
      </span>
    ) : (
      'Continue →'
    )}
  </Button>
</div>
    </div>
  )
}
