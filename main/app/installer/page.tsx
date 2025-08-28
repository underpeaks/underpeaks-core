'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'



export default function WelcomePage() {
  const [accepted, setAccepted] = useState(false)
  const [licenseText, setLicenseText] = useState('')
  const router = useRouter()

  useEffect(() => {
  fetch('/license.txt') // ✅ Correct public path
    .then((res) => res.text())
    .then((text) => setLicenseText(text))
    .catch(() => setLicenseText('Failed to load license agreement.'))
}, [])


  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-12">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-black tracking-tight">🚀 NXT_Flutter</h1>
        <p className="text-xl text-gray-700 mt-2">Your All-in-One SaaS Installer & Code Generator</p>
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
      <div className="flex justify-end mt-auto max-w-4xl mx-auto">
        <Button disabled={!accepted} onClick={() => router.push('/installer/project')}>
          Continue →
        </Button>
      </div>
    </div>
  )
}
