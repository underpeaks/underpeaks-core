/**
 * DemoPage Component
 *
 * This is the Demo Content step of the NXTFlutter installer wizard.
 * It is shown after the user has completed earlier installer steps and
 * before they reach the final "Finalise" step.
 *
 * What this page does:
 * - Lets the user select a project type from a list of templates
 *   (e.g. E-commerce, Marketplace, Blog, Blank, etc.).
 * - Each project type shows a short description of what it includes.
 * - For non-blank project types, shows a "Setup Demo Content" card where
 *   the user can opt in to having sample data pre-loaded into their project.
 * - For the E-commerce project type specifically, shows a detailed bullet
 *   list of what demo content will be installed.
 * - On "Continue", saves the selected project type and demo preference to
 *   the installer store, then navigates to the /installer/finalise step.
 *
 * Installer store:
 * - `demoContentEnabled`  — Whether the user wants demo content installed.
 * - `selectedProjectType` — The ID of the chosen project template.
 */

'use client'

import { useState }            from 'react'
import { useRouter }           from 'next/navigation'
import { useTranslations }     from 'next-intl'
import { Button }              from '@/components/ui/button'
import { Checkbox }            from '@/components/ui/checkbox'
import { Label }               from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
}                              from '@/components/ui/card'
import { Loader2 }             from 'lucide-react'
import { useInstallerStore }   from '../../../store/useInstallerStore'
import LocaleSwitcher          from '@/core/LocaleSwitcher'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DemoPage
 *
 * The project type and demo content selection step of the installer.
 *
 * State managed here:
 * - `installDemo`       — Whether the user has checked "Include demo content".
 * - `loading`           — Whether the continue button is in its loading state.
 * - `selectedProject`   — The currently selected project template ID.
 */
export default function DemoPage() {
  /**
   * t — Translation function scoped to the 'demoPage' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('demoPage')

  /**
   * router — Next.js router used to navigate to the next installer step.
   */
  const router = useRouter()

  /**
   * setInstallerValue — Function from the installer store used to save
   * the user's selections so they are available in later installer steps.
   */
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue)

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Whether the user has opted in to installing demo content. */
  const [installDemo,       setInstallDemo]       = useState(false)

  /** Whether the continue action is in progress (shows spinner). */
  const [loading,           setLoading]           = useState(false)

  /**
   * The currently selected project type ID.
   * Defaults to 'blank' so the user starts with no template selected.
   */
  const [selectedProject,   setSelectedProject]   = useState<string>('blank')

  // -------------------------------------------------------------------------
  // Static data
  // -------------------------------------------------------------------------

  /**
   * projectOptions
   *
   * The list of project type choices shown as radio-style cards.
   * Each has a value (ID) and a translated label with an emoji prefix.
   */
  const projectOptions = [
    { value: 'ecommerce',   label: t('projects.ecommerce.label')   },
    { value: 'marketplace', label: t('projects.marketplace.label') },
    { value: 'listing',     label: t('projects.listing.label')     },
    { value: 'blog',        label: t('projects.blog.label')        },
    { value: 'social',      label: t('projects.social.label')      },
    { value: 'saas',        label: t('projects.saas.label')        },
    { value: 'blank',       label: t('projects.blank.label')       },
  ]

  /**
   * projectDescriptions
   *
   * A map from project type ID to a translated short description.
   * Shown below each project option label to help the user decide.
   */
  const projectDescriptions: Record<string, string> = {
    ecommerce:   t('projects.ecommerce.description'),
    marketplace: t('projects.marketplace.description'),
    listing:     t('projects.listing.description'),
    blog:        t('projects.blog.description'),
    social:      t('projects.social.description'),
    saas:        t('projects.saas.description'),
    blank:       t('projects.blank.description'),
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleNext
   *
   * Called when the user clicks "Continue".
   *
   * Steps:
   * 1. Shows the loading spinner on the button.
   * 2. Saves `demoContentEnabled` and `selectedProjectType` to the
   *    installer store so the finalise step can read them.
   * 3. After a short delay (1 second), navigates to /installer/finalise.
   *
   * The delay gives the user visual feedback that something is happening
   * before the page transitions.
   */
  const handleNext = () => {
    setLoading(true)
    console.log(t('logs.navigatingToFinalise'))

    setInstallerValue('demoContentEnabled',  installDemo)
    setInstallerValue('selectedProjectType', selectedProject)

    setTimeout(() => {
      router.push('/installer/finalise')
    }, 1000)
  }

  /**
   * showDemoCard
   *
   * Controls whether the "Setup Demo Content" card is shown.
   * Hidden when "Blank Project" is selected because a blank project
   * has no demo content to offer.
   */
  const showDemoCard = selectedProject !== 'blank'

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      {/* ------------------------------------------------------------------
        * Locale switcher — fixed in the top-right corner so the user can
        * change language at any point during the installer.
        * ------------------------------------------------------------------ */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ------------------------------------------------------------------
        * Page header — logo and tagline
        * ------------------------------------------------------------------ */}
      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/NXT_Flutter_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">
          {t('tagline')}
        </p>
      </header>

      {/* ------------------------------------------------------------------
        * Project Type Card
        * Radio-style list of project templates. Clicking any row selects it.
        * The active row gets a black border and a light background.
        * ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>{t('projectType.title')}</CardTitle>
          <CardDescription>{t('projectType.description')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-1">
          {projectOptions.map((option) => {
            const isActive = selectedProject === option.value
            return (
              <div
                key={option.value}
                onClick={() => setSelectedProject(option.value)}
                className={`
                  flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                  ${isActive
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400'
                  }
                `}
              >
                {/* Radio input — read-only, visual state driven by `isActive` */}
                <input
                  type="radio"
                  name="projectType"
                  checked={isActive}
                  readOnly
                  className="mt-1 h-4 w-4 accent-black bg-white border-gray-400"
                />

                {/* Project label and description */}
                <div className="flex flex-col">
                  <span className="text-base font-medium">
                    {option.label}
                  </span>
                  <span className="text-sm text-gray-500 mt-1">
                    {projectDescriptions[option.value]}
                  </span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------
        * Demo Content Card
        * Only shown when a non-blank project type is selected.
        * Lets the user opt in to sample data being pre-loaded.
        * For E-commerce, shows a detailed bullet list of what's included.
        * ------------------------------------------------------------------ */}
      {showDemoCard && (
        <Card>
          <CardHeader>
            <CardTitle>{t('demoContent.title')}</CardTitle>
            <CardDescription>{t('demoContent.description')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Demo content checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="demoData"
                checked={installDemo}
                onCheckedChange={(checked) => setInstallDemo(!!checked)}
              />
              <Label htmlFor="demoData" className="font-medium">
                {t('demoContent.checkboxLabel')}
              </Label>
            </div>

            {/*
             * E-commerce demo content detail list
             * Only shown when demo is enabled AND ecommerce is selected.
             * Lists exactly what sample data will be installed.
             */}
            {installDemo && selectedProject === 'ecommerce' && (
              <ul className="text-sm text-gray-600 list-disc pl-6 space-y-1">
                <li>{t('demoContent.ecommerce.item1')}</li>
                <li>{t('demoContent.ecommerce.item2')}</li>
                <li>{t('demoContent.ecommerce.item3')}</li>
                <li>{t('demoContent.ecommerce.item4')}</li>
                <li>{t('demoContent.ecommerce.item5')}</li>
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------------------------
        * Continue Button
        * Full-width, right-aligned. Shows a spinner while loading.
        * ------------------------------------------------------------------ */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleNext} disabled={loading} className="w-full">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? t('continueButtonLoading') : t('continueButtonIdle')}
        </Button>
      </div>

    </div>
  )
}