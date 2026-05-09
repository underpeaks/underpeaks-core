'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckedState } from '@radix-ui/react-checkbox'
import { Loader2 } from 'lucide-react'
import { useInstallerStore } from '../../../store/useInstallerStore'
import LocaleSwitcher from '@/core/LocaleSwitcher'

export default function EcommercePage() {
  const router = useRouter()
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue)
  const [includeEcommerce, setIncludeEcommerce] = useState(false)
  const [physicalProducts, setPhysicalProducts] = useState(false)
  const [digitalProducts, setDigitalProducts] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleNext = () => {
    setLoading(true)

    // Save to Zustand
    setInstallerValue('ecommerceEnabled', includeEcommerce)

    setInstallerValue('selectedPages', ((prev: any) => {
      const pages = new Set(prev ?? [])
      if (includeEcommerce) pages.add('ecommerce')
      else pages.delete('ecommerce')
      return Array.from(pages)
    }) as any)

    // Simulate delay or async behavior
    setTimeout(() => {
      router.push('/installer/demo')
    }, 1000)
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
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


      <Card>
        <CardHeader>
          <CardTitle>Customize your e-commerce modules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Ecommerce */}
          <div className="space-y-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="include-ecommerce"
                checked={includeEcommerce}
                onCheckedChange={(checked: CheckedState) =>
                  setIncludeEcommerce(checked === true)
                }
              />
              <Label htmlFor="include-ecommerce">Enable E-commerce Module</Label>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Adds product catalog, cart, checkout, and order management features.
            </p>
          </div>

          {/* Sub-options */}
          {includeEcommerce && (
            <div className="space-y-4 pl-6">
              <div className="space-y-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="physical-products"
                    checked={physicalProducts}
                    onCheckedChange={(checked: CheckedState) =>
                      setPhysicalProducts(checked === true)
                    }
                  />
                  <Label htmlFor="physical-products">Include Physical Products</Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  Supports inventory, shipping, returns, and tracking for tangible goods.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="digital-products"
                    checked={digitalProducts}
                    onCheckedChange={(checked: CheckedState) =>
                      setDigitalProducts(checked === true)
                    }
                  />
                  <Label htmlFor="digital-products">Include Digital Products</Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  Sell downloadable content like PDFs, videos, or software licenses.
                </p>
              </div>
            </div>
          )}

          {/* Next Button */}
          <div className="flex justify-end pt-6">
            <Button onClick={handleNext} disabled={loading} className="w-full">
              {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              {loading ? 'Continuing...' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
