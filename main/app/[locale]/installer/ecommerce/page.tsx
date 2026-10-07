// EcommercePage.tsx  (installer: e-commerce options, nothing links to it right now)
'use client'

import { useState }              from 'react'
import { useRouter }             from 'next/navigation'
import { useTranslations }       from 'next-intl'
import { Button }                from '@/components/ui/button'
import { Checkbox }              from '@/components/ui/checkbox'
import { Label }                 from '@/components/ui/label'
import { CheckedState }          from '@radix-ui/react-checkbox'
import { Loader2 }               from 'lucide-react'
import { useInstallerStore }     from '../../../store/useInstallerStore'
import InstallerShell, { CARD, PRIMARY_BUTTON } from '@/core/InstallerShell'

const CHECKBOX_CLASS =
  'mt-0.5 h-5 w-5 rounded border-neutral-400 data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white'

export default function EcommercePage() {
  const router = useRouter()
  const t      = useTranslations('ecommercePage')

  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue)

  const [includeEcommerce, setIncludeEcommerce] = useState(false)
  const [physicalProducts, setPhysicalProducts] = useState(false)
  const [digitalProducts,  setDigitalProducts]  = useState(false)
  const [loading,          setLoading]          = useState(false)

  const handleNext = () => {
    setLoading(true)

    setInstallerValue('ecommerceEnabled', includeEcommerce)

    setInstallerValue('selectedPages', ((prev: any) => {
      const pages = new Set(prev ?? [])
      if (includeEcommerce) pages.add('ecommerce')
      else pages.delete('ecommerce')
      return Array.from(pages)
    }) as any)

    setTimeout(() => {
      router.push('/installer/demo')
    }, 1000)
  }

  return (
    <InstallerShell step={6} width="sm" logoAlt={t('logoAlt')} tagline={t('tagline')}>
      <div className={CARD}>

        <h1 className="text-2xl font-semibold tracking-tight">{t('card.title')}</h1>

        <div className="mt-6 space-y-6">

          {/* Enable e-commerce */}
          <div className="space-y-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="include-ecommerce"
                checked={includeEcommerce}
                onCheckedChange={(checked: CheckedState) =>
                  setIncludeEcommerce(checked === true)
                }
                className={CHECKBOX_CLASS}
              />
              <Label htmlFor="include-ecommerce" className="text-sm font-medium text-neutral-900">
                {t('options.ecommerce.label')}
              </Label>
            </div>
            <p className="ml-8 text-sm text-neutral-500">
              {t('options.ecommerce.description')}
            </p>
          </div>

          {/* Sub-options */}
          {includeEcommerce && (
            <div className="space-y-5 border-l-2 border-neutral-200 pl-6">

              <div className="space-y-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="physical-products"
                    checked={physicalProducts}
                    onCheckedChange={(checked: CheckedState) =>
                      setPhysicalProducts(checked === true)
                    }
                    className={CHECKBOX_CLASS}
                  />
                  <Label htmlFor="physical-products" className="text-sm font-medium text-neutral-900">
                    {t('options.physical.label')}
                  </Label>
                </div>
                <p className="ml-8 text-sm text-neutral-500">
                  {t('options.physical.description')}
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
                    className={CHECKBOX_CLASS}
                  />
                  <Label htmlFor="digital-products" className="text-sm font-medium text-neutral-900">
                    {t('options.digital.label')}
                  </Label>
                </div>
                <p className="ml-8 text-sm text-neutral-500">
                  {t('options.digital.description')}
                </p>
              </div>

            </div>
          )}

        </div>

        <Button
          onClick={handleNext}
          disabled={loading}
          className={`${PRIMARY_BUTTON} mt-8 w-full`}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t('button.continuing') : t('button.next')}
        </Button>

      </div>
    </InstallerShell>
  )
}