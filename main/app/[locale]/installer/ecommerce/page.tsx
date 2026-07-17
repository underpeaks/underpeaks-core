/**
 * EcommercePage Component
 *
 * This is a step in the multi-step installer wizard that allows the user to
 * configure e-commerce features for their generated application.
 *
 * What this page does:
 * - Lets the user opt in or out of including an e-commerce module.
 * - If e-commerce is enabled, reveals sub-options for physical and digital products.
 * - Saves the user's choices into the global installer store (Zustand) so other
 *   steps in the wizard can access them.
 * - Navigates to the next installer step (/installer/demo) when the user clicks "Next".
 *
 * Component hierarchy:
 *   EcommercePage          ← this file (owns local UI state + triggers navigation)
 *   ├── LocaleSwitcher     ← floating locale/language selector (top-right corner)
 *   ├── Card               ← shadcn/ui card wrapping all options
 *   │   ├── Checkbox       ← "Enable E-commerce Module" toggle
 *   │   ├── Checkbox       ← "Include Physical Products" (conditionally shown)
 *   │   ├── Checkbox       ← "Include Digital Products"  (conditionally shown)
 *   │   └── Button         ← "Next" / "Continuing..." with loading spinner
 */

'use client'

import { useState }              from 'react'
import { useRouter }             from 'next/navigation'
import { useTranslations }       from 'next-intl'
import { Button }                from '@/components/ui/button'
import { Checkbox }              from '@/components/ui/checkbox'
import { Label }                 from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckedState }          from '@radix-ui/react-checkbox'
import { Loader2 }               from 'lucide-react'
import { useInstallerStore }     from '../../../store/useInstallerStore'
import LocaleSwitcher            from '@/core/LocaleSwitcher'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * EcommercePage
 *
 * A wizard step that collects the user's e-commerce preferences.
 * Uses local React state for the checkboxes, then writes the final
 * selections into the shared Zustand installer store when "Next" is clicked.
 */
export default function EcommercePage() {
  /**
   * router — Next.js router used to programmatically navigate to the next step.
   */
  const router = useRouter()

  /**
   * t — Translation function scoped to the 'ecommercePage' namespace.
   * Use t('someKey') to get the translated string for that key.
   */
  const t = useTranslations('ecommercePage')

  /**
   * setInstallerValue — Action from the global Zustand installer store.
   * Calling setInstallerValue('key', value) persists a value that all
   * wizard steps can read, even after navigating between pages.
   */
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue)

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * includeEcommerce — Whether the user wants to add the e-commerce module at all.
   * Controls whether the sub-options (physical/digital) are visible.
   */
  const [includeEcommerce, setIncludeEcommerce] = useState(false)

  /**
   * physicalProducts — Whether to include support for physical (shippable) goods.
   * Only relevant when includeEcommerce is true.
   */
  const [physicalProducts, setPhysicalProducts] = useState(false)

  /**
   * digitalProducts — Whether to include support for downloadable/digital goods.
   * Only relevant when includeEcommerce is true.
   */
  const [digitalProducts, setDigitalProducts] = useState(false)

  /**
   * loading — Tracks whether the "Next" action is in progress.
   * When true, the button shows a spinner and is disabled to prevent double-clicks.
   */
  const [loading, setLoading] = useState(false)

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleNext
   *
   * Called when the user clicks the "Next" button.
   *
   * Steps:
   * 1. Sets `loading` to true so the spinner appears and the button is disabled.
   * 2. Saves `ecommerceEnabled` (true/false) to the installer store.
   * 3. Updates `selectedPages` in the store:
   *    - If e-commerce is enabled, adds 'ecommerce' to the set of selected pages.
   *    - If disabled, removes 'ecommerce' from the set.
   *    - Uses a Set to guarantee no duplicate page entries.
   * 4. After a short simulated delay (1 second), navigates to /installer/demo.
   *
   * Note: The setTimeout simulates an async operation (e.g., an API call).
   * In a real scenario, you might replace it with an actual async/await call.
   */
  const handleNext = () => {
    setLoading(true)

    // Persist whether e-commerce is enabled in the global installer store
    setInstallerValue('ecommerceEnabled', includeEcommerce)

    // Update the selectedPages list: add or remove 'ecommerce' based on the toggle
    setInstallerValue('selectedPages', ((prev: any) => {
      const pages = new Set(prev ?? [])
      if (includeEcommerce) pages.add('ecommerce')
      else pages.delete('ecommerce')
      return Array.from(pages)
    }) as any)

    // Simulate a short delay before navigating (replace with real async logic if needed)
    setTimeout(() => {
      router.push('/installer/demo')
    }, 1000)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">

      {/* ----------------------------------------------------------------
        * Locale Switcher
        * Fixed to the top-right corner so the user can change language
        * at any point during the installer wizard.
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header
        * Displays the product logo and a short tagline describing the app.
        * ---------------------------------------------------------------- */}
      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/underpeaks_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      {/* ----------------------------------------------------------------
        * Options Card
        * Contains all e-commerce configuration checkboxes and the Next button.
        * ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t('card.title')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* --------------------------------------------------------------
            * Enable E-commerce Toggle
            * The primary checkbox. When checked, reveals the sub-options below.
            * -------------------------------------------------------------- */}
          <div className="space-y-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="include-ecommerce"
                checked={includeEcommerce}
                onCheckedChange={(checked: CheckedState) =>
                  setIncludeEcommerce(checked === true)
                }
              />
              <Label htmlFor="include-ecommerce">
                {t('options.ecommerce.label')}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              {t('options.ecommerce.description')}
            </p>
          </div>

          {/* --------------------------------------------------------------
            * Sub-options (conditionally rendered)
            * Only visible when the user has enabled the e-commerce module.
            * -------------------------------------------------------------- */}
          {includeEcommerce && (
            <div className="space-y-4 pl-6">

              {/* Physical Products */}
              <div className="space-y-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="physical-products"
                    checked={physicalProducts}
                    onCheckedChange={(checked: CheckedState) =>
                      setPhysicalProducts(checked === true)
                    }
                  />
                  <Label htmlFor="physical-products">
                    {t('options.physical.label')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  {t('options.physical.description')}
                </p>
              </div>

              {/* Digital Products */}
              <div className="space-y-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="digital-products"
                    checked={digitalProducts}
                    onCheckedChange={(checked: CheckedState) =>
                      setDigitalProducts(checked === true)
                    }
                  />
                  <Label htmlFor="digital-products">
                    {t('options.digital.label')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  {t('options.digital.description')}
                </p>
              </div>

            </div>
          )}

          {/* --------------------------------------------------------------
            * Next Button
            * Disabled and shows a spinner while the navigation delay runs.
            * -------------------------------------------------------------- */}
          <div className="flex justify-end pt-6">
            <Button onClick={handleNext} disabled={loading} className="w-full">
              {/* Spinner icon — only visible while loading is true */}
              {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
              {loading ? t('button.continuing') : t('button.next')}
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  )
}