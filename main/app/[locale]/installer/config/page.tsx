'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useInstallerStore } from '../../../store/useInstallerStore'
import { Loader2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import LocaleSwitcher from '@/core/LocaleSwitcher'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'


export default function StackConfigPage() {
  const router = useRouter()
  const { selectedStack, setInstallerValue } = useInstallerStore()
  const [stack, setStack] = useState<'next' | 'flutter' | 'both' | 'cms'>(selectedStack || 'both')
  const [loading, setLoading] = useState(false)

  const handleNext = () => {
    setLoading(true)
    setInstallerValue('selectedStack', stack)
    setTimeout(() => {
      router.push('/installer/database')
    }, 200)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">
      {/* Locale switcher — top right */}
            <div className="fixed top-4 right-4 z-50">
              <LocaleSwitcher />
            </div>
      <header className="mb-8 text-center flex flex-col items-center">
        <img 
          src="/images/logo/NXT_Flutter_logo.png" 
          alt="NXT_Flutter Logo" 
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">Your All-in-One SaaS Installer & Code Generator</p>
      </header>

      <div className="w-full max-w-md p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Stack</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select the technology stack that best fits your project needs. You can change this later if you want to add more platforms or switch your approach.
        </p>

        <RadioGroup 
           value={stack}
  onValueChange={(value) => {
    console.log('Radio changed:', value)
    setStack(value as 'next' | 'flutter' | 'both' | 'cms')
  }} 
        >
          <FieldLabel htmlFor="both">
            <Field orientation="horizontal">
              <RadioGroupItem value="both" id="both" />
              <FieldContent>
                <FieldTitle>Next.js + Flutter</FieldTitle>
                <FieldDescription>
                  Fullstack combo! Next.js for web and Flutter for cross-platform mobile and desktop apps.
                </FieldDescription>
              </FieldContent>
              
            </Field>
          </FieldLabel>

          <FieldLabel htmlFor="next">
            <Field orientation="horizontal">
              <RadioGroupItem value="next" id="next" />
              <FieldContent>
                <FieldTitle>Next.js Only</FieldTitle>
                <FieldDescription>
                  Use Next.js as a powerful React SSR framework and <strong>as a headless CMS to manage content and APIs.</strong>
                </FieldDescription>
              </FieldContent>
              
            </Field>
          </FieldLabel>

          <FieldLabel htmlFor="flutter">
            <Field orientation="horizontal">
              <RadioGroupItem value="flutter" id="flutter" />
              <FieldContent>
                <FieldTitle>Flutter Only</FieldTitle>
                <FieldDescription>
                  Build cross-platform mobile and desktop apps with Flutter using a shared codebase, and <strong>use it as a headless CMS backend if desired.</strong>
                </FieldDescription>
              </FieldContent>
              
            </Field>
          </FieldLabel>

          <FieldLabel htmlFor="cms">
            <Field orientation="horizontal">
              <RadioGroupItem value="cms" id="cms" />
              <FieldContent>
                <FieldTitle>Headless CMS</FieldTitle>
                <FieldDescription>
                  Deploy as a headless CMS backend only. Expose your data through APIs and connect it to any custom frontend, mobile application, or third-party service with full flexibility.
                </FieldDescription>
              </FieldContent>
              
            </Field>
          </FieldLabel>
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