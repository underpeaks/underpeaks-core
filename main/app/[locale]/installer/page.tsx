'use client'

/**
 * WelcomePage Component
 *
 * This is the very first page the user sees when they start the installer wizard.
 * It serves as an introduction to the platform and requires the user to read and
 * accept the license agreement before they can proceed.
 *
 * What this page does:
 * - Displays the platform logo and tagline at the top.
 * - Shows a bullet-point list of platform benefits so the user understands
 *   what they are installing.
 * - Fetches and displays the contents of /public/license.txt in a scrollable
 *   box so the user can read the full license agreement.
 * - Provides a checkbox the user must tick to confirm they accept the terms.
 * - Enables the "Continue" button only after the checkbox is ticked.
 * - Navigates the user to /installer/project when they click "Continue".
 *
 * Component hierarchy:
 *   WelcomePage         ← this file (owns all state + side effects)
 *   ├── LocaleSwitcher  ← language selector fixed to the top-right corner
 *   ├── <header>        ← logo + tagline
 *   ├── Benefits        ← bullet list of platform highlights
 *   ├── License Box     ← scrollable area showing license.txt content
 *   ├── Checkbox        ← accept-terms toggle
 *   └── Continue Button ← disabled until terms are accepted
 */

import { useEffect, useState }  from 'react'
import { useRouter }            from 'next/navigation'
import { useTranslations }      from 'next-intl'
import { Checkbox }             from '@/components/ui/checkbox'
import { Loader2 }              from 'lucide-react'
import { Button }               from '@/components/ui/button'
import LocaleSwitcher           from '@/core/LocaleSwitcher'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * WelcomePage
 *
 * The entry point of the installer wizard. Presents platform benefits,
 * displays the license agreement fetched from the server, and requires the
 * user to accept the terms before continuing to the project setup step.
 */
export default function WelcomePage() {
  /**
   * t — Translation function scoped to the 'welcomePage' namespace.
   * Use t('someKey') to retrieve the translated string for that key.
   * All user-visible text in this component comes through this function.
   */
  const t = useTranslations('welcomePage')

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * accepted — Tracks whether the user has ticked the "Accept the license
   * terms" checkbox. The Continue button stays disabled until this is true.
   */
  const [accepted, setAccepted] = useState(false)

  /**
   * licenseText — The raw text content of the license agreement file
   * (/public/license.txt). Starts empty and is populated by the useEffect
   * below once the file has been fetched from the server.
   */
  const [licenseText, setLicenseText] = useState('')

  /**
   * loading — Whether the page is in a transitional "loading" state after
   * the user clicked Continue. While true, the button shows a spinner and
   * is disabled to prevent duplicate clicks.
   */
  const [loading, setLoading] = useState(false)

  /**
   * router — Next.js router used to navigate to the next installer step
   * (/installer/project) once the user accepts the terms and clicks Continue.
   */
  const router = useRouter()

  // -------------------------------------------------------------------------
  // Fetch license text on mount
  // -------------------------------------------------------------------------

  /**
   * useEffect — Fetches the license agreement text when the page first loads.
   *
   * This runs once (empty dependency array []) immediately after the component
   * mounts. It requests /license.txt from the public folder and stores the
   * plain-text result in the `licenseText` state so it can be rendered in the
   * scrollable license box below.
   *
   * If the fetch fails for any reason (network error, file missing, etc.),
   * a translated fallback message is shown instead so the user is not left
   * with a blank box.
   */
  useEffect(() => {
    fetch('/license.txt')
      .then((res) => res.text())
      .then((text) => setLicenseText(text))
      .catch(() => setLicenseText(t('license.loadFailed')))
  }, [])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleContinue
   *
   * Called when the user clicks the "Continue" button.
   *
   * Steps:
   * 1. Sets loading to true — disables the button and shows the spinner.
   * 2. After a short 100ms delay (to allow React to re-render the spinner),
   *    navigates the user to the project setup page: /installer/project.
   *
   * The button is already disabled if `accepted` is false, so this function
   * will only ever be called when the user has ticked the checkbox.
   */
  const handleContinue = () => {
    setLoading(true)
    setTimeout(() => {
      router.push('/installer/project')
    }, 100)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-12">

      {/* ----------------------------------------------------------------
        * Locale Switcher
        * Fixed to the top-right corner so the user can change language
        * at any point before or during the installer flow.
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header
        * Displays the platform logo and a short descriptive tagline.
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
        * Benefits Section
        * A bullet-point list explaining why the user should use this
        * platform. Each bullet is independently translated so they can
        * be localised naturally in each language.
        * ---------------------------------------------------------------- */}
      <section className="max-w-3xl mx-auto text-gray-800 mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          {t('benefits.heading')}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-base">
          <li>{t('benefits.item1')}</li>
          <li>{t('benefits.item2')}</li>
          <li>{t('benefits.item3')}</li>
          <li>{t('benefits.item4')}</li>
          <li>{t('benefits.item5')}</li>
          <li>{t('benefits.item6')}</li>
        </ul>
      </section>

      {/* ----------------------------------------------------------------
        * License Agreement Section
        * Shows the heading, the scrollable license text box, and the
        * accept-terms checkbox beneath it.
        * ---------------------------------------------------------------- */}
      <section className="max-w-4xl mx-auto flex flex-col space-y-4 mb-8">
        <h3 className="text-xl font-semibold text-gray-900">
          {t('license.heading')}
        </h3>

        {/*
         * Scrollable license text box.
         * While the file is still being fetched, shows a translated
         * "Loading license..." placeholder. Once loaded, displays the
         * raw text with whitespace preserved (whitespace-pre-wrap).
         */}
        <div className="bg-gray-100 border border-gray-300 p-4 rounded max-h-72 overflow-y-auto text-sm text-black whitespace-pre-wrap">
          {licenseText || t('license.loading')}
        </div>

        {/* --------------------------------------------------------------
          * Accept Terms Checkbox
          * The user must tick this before the Continue button is enabled.
          * Ticking sets `accepted` to true; unticking sets it back to false.
          * -------------------------------------------------------------- */}
        <div className="flex justify-center items-center mt-4">
          <div className="flex items-center space-x-3 bg-white text-black px-4 py-2 rounded shadow-md">
            <Checkbox
              id="accept"
              checked={accepted}
              onCheckedChange={(val) => setAccepted(!!val)}
              className="border-black bg-white text-black"
            />
            <label htmlFor="accept" className="text-black font-medium">
              {t('license.acceptLabel')}
            </label>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
        * Continue Button
        * Disabled when the user has not yet accepted the terms OR while
        * the loading state is active. Shows a spinner during the short
        * navigation delay so the user gets visual feedback.
        * ---------------------------------------------------------------- */}
      <div className="flex justify-end mt-auto max-w-6xl mx-auto">
        <Button
          disabled={!accepted || loading}
          onClick={handleContinue}
          className="px-8 py-6 text-lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('continueLoading')}
            </span>
          ) : (
            t('continueButton')
          )}
        </Button>
      </div>

    </div>
  )
}