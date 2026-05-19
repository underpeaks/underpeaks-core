'use client'

/**
 * StackConfigPage Component
 *
 * This is the installer wizard step where the user selects the technology
 * stack they want to use for their project. It appears after the welcome/intro
 * screen and before the database configuration step.
 *
 * What this page does:
 * ────────────────────
 * - Renders a radio-button group with four mutually exclusive stack options:
 *     • Next.js + Flutter  — fullstack web + cross-platform mobile/desktop.
 *     • Next.js Only       — web/SSR framework with headless CMS capability.
 *     • Flutter Only       — cross-platform mobile/desktop with optional CMS.
 *     • Headless CMS       — API-only backend, no opinionated frontend.
 * - Pre-selects whichever stack was previously chosen (from the installer
 *   store), defaulting to 'both' on first visit.
 * - When the user clicks "Next":
 *     1. Saves the selected stack to the global Zustand installer store so
 *        later steps (project creation, install sequence) can read it.
 *     2. Shows a brief loading spinner for 200 ms.
 *     3. Navigates to /installer/database — the next wizard step.
 *
 * State managed here:
 *   - stack   : the currently selected radio value ('next' | 'flutter' |
 *               'both' | 'cms'). Initialised from the store if available.
 *   - loading : true for 200 ms after clicking "Next", while navigating
 *               to the database step.
 */

import { Button }        from '@/components/ui/button'
import { useRouter }     from 'next/navigation'
import { useState }      from 'react'
import { useTranslations } from 'next-intl'
import { useInstallerStore } from '../../../store/useInstallerStore'
import { Loader2 }       from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import LocaleSwitcher    from '@/core/LocaleSwitcher'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'

/**
 * StackType
 *
 * The four valid stack choices a user can select in the installer.
 * Used to type the `stack` state and the store's `selectedStack` field.
 *
 *   'both'    — Next.js + Flutter (fullstack web + mobile/desktop).
 *   'next'    — Next.js only (web/SSR + headless CMS).
 *   'flutter' — Flutter only (mobile/desktop + optional CMS backend).
 *   'cms'     — Headless CMS backend only (no opinionated frontend).
 */
type StackType = 'next' | 'flutter' | 'both' | 'cms'

/**
 * StackConfigPage
 *
 * The installer wizard step for choosing the project technology stack.
 * See the file-level JSDoc above for a full description.
 */
export default function StackConfigPage() {
  /**
   * t — Translation function scoped to the 'stackConfigPage' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('stackConfigPage')

  /** Next.js router — used to navigate to /installer/database after saving. */
  const router = useRouter()

  /**
   * selectedStack — the stack value previously saved in the installer store,
   * if the user has already visited this step. Used to pre-select the radio.
   * setInstallerValue — Zustand action to write a single key to the store.
   */
  const { selectedStack, setInstallerValue } = useInstallerStore()

  /**
   * stack
   * The currently highlighted radio-button value.
   * Initialised from the store's selectedStack if present, otherwise defaults
   * to 'both' so the user always has a sensible starting selection.
   */
  const [stack,   setStack]   = useState<StackType>(selectedStack || 'both')

  /**
   * loading
   * True for 200 ms after the user clicks "Next", while the app saves the
   * selection to the store and navigates to the next step. Disables the
   * button and shows a spinner to prevent accidental double-clicks.
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
   * 1. Sets loading to true — disables the button and shows the spinner.
   * 2. Persists the selected stack to the installer store so the install
   *    step sequence knows which project(s) to scaffold.
   * 3. After 200 ms, navigates to /installer/database.
   */
  const handleNext = () => {
    setLoading(true)
    setInstallerValue('selectedStack', stack)
    setTimeout(() => {
      router.push('/installer/database')
    }, 200)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      {/* ----------------------------------------------------------------
        * Locale Switcher
        * Fixed to the top-right corner so the user can change language at
        * any point during the installer flow without losing their progress.
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header — Logo and tagline
        * ---------------------------------------------------------------- */}
      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/NXT_Flutter_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      {/* ----------------------------------------------------------------
        * Stack Selection Card
        * ---------------------------------------------------------------- */}
      <div className="w-full max-w-md p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">

        {/* Card title and intro text */}
        <h2 className="text-2xl font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('description')}</p>

        {/* --------------------------------------------------------------
          * Radio Group — one option per available stack.
          * The value is kept in local `stack` state and only written to
          * the store when the user confirms by clicking "Next".
          * -------------------------------------------------------------- */}
        <RadioGroup
          value={stack}
          onValueChange={(value) => setStack(value as StackType)}
        >

          {/* Option: Next.js + Flutter */}
          <FieldLabel htmlFor="both">
            <Field orientation="horizontal">
              <RadioGroupItem value="both" id="both" />
              <FieldContent>
                <FieldTitle>{t('stacks.both.title')}</FieldTitle>
                <FieldDescription>{t('stacks.both.description')}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

          {/* Option: Next.js Only */}
          <FieldLabel htmlFor="next">
            <Field orientation="horizontal">
              <RadioGroupItem value="next" id="next" />
              <FieldContent>
                <FieldTitle>{t('stacks.next.title')}</FieldTitle>
                <FieldDescription>
                  {/*
                   * The Next.js description contains an inline <strong> element
                   * to emphasise the headless CMS capability. dangerouslySetInnerHTML
                   * is used here because next-intl rich-text rendering requires it
                   * for embedded HTML tags in translation strings.
                   * The string value comes from our own controlled en.json file,
                   * so there is no XSS risk.
                   */}
                  <span
                    dangerouslySetInnerHTML={{ __html: t.raw('stacks.next.description') }}
                  />
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

          {/* Option: Flutter Only */}
          <FieldLabel htmlFor="flutter">
            <Field orientation="horizontal">
              <RadioGroupItem value="flutter" id="flutter" />
              <FieldContent>
                <FieldTitle>{t('stacks.flutter.title')}</FieldTitle>
                <FieldDescription>
                  {/* Same rich-text pattern as the Next.js option above. */}
                  <span
                    dangerouslySetInnerHTML={{ __html: t.raw('stacks.flutter.description') }}
                  />
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

          {/* Option: Headless CMS */}
          <FieldLabel htmlFor="cms">
            <Field orientation="horizontal">
              <RadioGroupItem value="cms" id="cms" />
              <FieldContent>
                <FieldTitle>{t('stacks.cms.title')}</FieldTitle>
                <FieldDescription>{t('stacks.cms.description')}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

        </RadioGroup>

        {/* ----------------------------------------------------------------
          * Next Button
          * Disabled while loading. Shows a spinner while the app saves the
          * stack selection and transitions to the database config step.
          * ---------------------------------------------------------------- */}
        <div className="pt-4">
          <Button className="w-full" onClick={handleNext} disabled={loading}>
            {loading
              ? <Loader2 className="animate-spin h-5 w-5" />
              : t('nextButton')
            }
          </Button>
        </div>

      </div>
    </div>
  )
}