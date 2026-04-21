'use client'

import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useInstallerStore } from '../../store/useInstallerStore'
import { Loader2 } from 'lucide-react' // Spinner icon (you can replace it)

export default function StackConfigPage() {
  const router = useRouter()
  const [stack, setStack] = useState<'next' | 'flutter' | 'both' | 'cms'>('both')
  const [loading, setLoading] = useState(false)

  const { setInstallerValue } = useInstallerStore()

  const handleNext = () => {
    setLoading(true)

    // Save to Zustand store
    setInstallerValue('selectedStack', stack)

    // Simulate a delay if needed (e.g., async call)
    setTimeout(() => {
      router.push('/installer/database')
    }, 500)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">
      {/* Logo & Tagline */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-black tracking-tight">🚀 NXT_Flutter</h1>
        <p className="text-sm text-gray-500">Build once. Run anywhere.</p>
      </header>

      {/* Card */}
      <div className="w-full max-w-md p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Stack</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select the technology stack that best fits your project needs. You can change this later if you want to add more platforms or switch your approach.
        </p>

        <RadioGroup defaultValue={stack} onValueChange={value => setStack(value as any)} className="space-y-6">
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="both" id="both" />
            <div>
              <label htmlFor="both" className="font-semibold text-gray-900 cursor-pointer">Next.js + Flutter</label>
              <p className="text-sm text-gray-600 max-w-md">
                Fullstack combo! Next.js for web and Flutter for cross-platform mobile and desktop apps.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="next" id="next" />
            <div>
              <label htmlFor="next" className="font-semibold text-gray-900 cursor-pointer">Next.js Only</label>
              <p className="text-sm text-gray-600 max-w-md">
                Use Next.js as a powerful React SSR framework and <strong>as a headless CMS to manage content and APIs.</strong>
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <RadioGroupItem value="flutter" id="flutter" />
            <div>
              <label htmlFor="flutter" className="font-semibold text-gray-900 cursor-pointer">Flutter Only</label>
              <p className="text-sm text-gray-600 max-w-md">
                Build cross-platform mobile and desktop apps with Flutter using a shared codebase, and <strong>use it as a headless CMS backend if desired.</strong>
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="cms" id="cms" />
            <div>
  <label htmlFor="cms" className="font-semibold text-gray-900 cursor-pointer">
    Headless CMS
  </label>
  <p className="text-sm text-gray-600 max-w-md">
    Deploy as a headless CMS backend only. Expose your data through APIs and connect it to any custom frontend, mobile application, or third-party service with full flexibility.
  </p>
</div>
          </div>
        </RadioGroup>

        <div className="pt-4">
          <Button className="w-full" onClick={handleNext} disabled={loading}>
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
