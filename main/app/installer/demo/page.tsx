'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { CheckedState } from '@radix-ui/react-checkbox'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useInstallerStore } from '../../store/useInstallerStore'

export default function DemoPage() {
  const router = useRouter()
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue)
  const [installDemo, setInstallDemo] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCheckedChange = (checked: CheckedState) => {
    setInstallDemo(checked === true)
  }

  const handleNext = () => {
    setLoading(true)

    // Save to Zustand store
    setInstallerValue('demoContentEnabled', installDemo)

    // Optional delay to simulate async flow
    setTimeout(() => {
      router.push('/installer/finalise')
    }, 1000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-black tracking-tight">🚀 NXT_Flutter</h1>
        <p className="text-sm text-gray-500">Build once. Run anywhere.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Setup Demo Content</CardTitle>
          <CardDescription>
            Preview your store with sample data already loaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="demoData"
                checked={installDemo}
                onCheckedChange={handleCheckedChange}
              />
              <Label htmlFor="demoData" className="font-medium">
                Include demo content for an e-commerce store:
              </Label>
            </div>

            {installDemo && (
              <ul className="text-muted-foreground text-sm list-disc list-inside pl-6 space-y-1">
                <li>Demo products with categories and tags</li>
                <li>Example customers and orders</li>
                <li>Storefront pages (home, products, cart, checkout)</li>
                <li>Basic CMS content (about us, contact, policies)</li>
                <li>Pre-configured menus and modules</li>
              </ul>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleNext} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Continuing...' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
