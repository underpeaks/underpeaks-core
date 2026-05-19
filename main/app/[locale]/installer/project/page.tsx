'use client'

/**
 * ProjectInfoPage Component
 *
 * This is the first step of the installer wizard. It collects basic project
 * configuration from the user before they proceed to set up their admin account.
 *
 * What this page does:
 * - Displays a logo and a short description of the platform.
 * - Provides a form where the user enters three pieces of information:
 *     1. Project Name  — a human-readable label for the project.
 *     2. Domain        — the full URL the app will be hosted at.
 *     3. Subdomain     — the subdomain prefix for the app's URL.
 * - Validates all fields before continuing (no empty values allowed).
 * - Saves the entered values into the global installer store.
 * - Navigates to the next installer step (/installer/admin) after a short delay.
 *
 * Component hierarchy:
 *   ProjectInfoPage       ← this file (owns all local state + validation)
 *   ├── LocaleSwitcher    ← language selector fixed to the top-right corner
 *   ├── <header>          ← logo + platform tagline
 *   └── Form Card         ← inputs for name, domain, subdomain + continue button
 */

import { Button }               from '@/components/ui/button'
import { Input }                from '@/components/ui/input'
import { useRouter }            from 'next/navigation'
import { useState, useCallback } from 'react'
import { useInstallerStore }    from '../../../store/useInstallerStore'
import { Loader2 }              from 'lucide-react'
import LocaleSwitcher           from '@/core/LocaleSwitcher'
import { useTranslations }      from 'next-intl'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ProjectInfoPage
 *
 * The first step of the multi-step installer wizard. Collects the project's
 * name, domain, and subdomain, validates them, stores them globally, and
 * then routes the user to the next step.
 */
export default function ProjectInfoPage() {
  /**
   * router — Next.js router used to navigate to the next installer step
   * after the user successfully fills in the form.
   */
  const router = useRouter()

  /**
   * setInstallerValue — A function from the global installer store (Zustand).
   * Calling setInstallerValue('key', value) persists a value across all
   * installer steps so later pages can access what was entered here.
   */
  const { setInstallerValue } = useInstallerStore()

  /**
   * t — Translation function scoped to the 'projectInfoPage' namespace.
   * Use t('someKey') to get the translated string for that key.
   * All user-visible text in this component comes through this function.
   */
  const t = useTranslations('projectInfoPage')

  // -------------------------------------------------------------------------
  // Form field state
  // -------------------------------------------------------------------------

  /** The value the user has typed into the Project Name input. */
  const [name, setName] = useState('')

  /**
   * The value the user has typed into the Subdomain input.
   * Defaults to 'console' as a sensible starting point.
   */
  const [subdomain, setSubdomain] = useState('console')

  /**
   * The value the user has typed into the Domain input.
   * Defaults to localhost for local development convenience.
   */
  const [domain, setDomain] = useState('http://localhost:3000')

  /**
   * Whether the form is in a "loading" state after the user clicked Continue.
   * While true, the button shows a spinner and is disabled to prevent
   * double-submissions.
   */
  const [loading, setLoading] = useState(false)

  // -------------------------------------------------------------------------
  // Validation error state
  // -------------------------------------------------------------------------

  /**
   * nameError — Holds a validation error message for the Project Name field.
   * Empty string means no error; a non-empty string is shown below the input.
   */
  const [nameError, setNameError] = useState('')

  /**
   * subdomainError — Holds a validation error message for the Subdomain field.
   * Empty string means no error; a non-empty string is shown below the input.
   */
  const [subdomainError, setSubdomainError] = useState('')

  /**
   * domainError — Holds a validation error message for the Domain field.
   * Empty string means no error; a non-empty string is shown below the input.
   */
  const [domainError, setDomainError] = useState('')

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleContinue
   *
   * Called when the user clicks the "Continue" button.
   *
   * Steps:
   * 1. Validates all three fields — sets individual error messages if any
   *    field is empty. If any field fails validation, the function stops early.
   * 2. Enables the loading spinner on the button.
   * 3. Saves all three values to the global installer store so they are
   *    available on subsequent installer pages.
   * 4. After a short 500ms delay (to allow the spinner to show), navigates
   *    the user to the next installer step: /installer/admin.
   *
   * `useCallback` is used here so this function is not recreated on every
   * render — only when its dependencies change. This is a minor performance
   * optimisation.
   */
  const handleContinue = useCallback(() => {
    let hasError = false

    // Validate: Project Name must not be blank
    if (!name.trim()) {
      setNameError(t('errors.nameRequired'))
      hasError = true
    } else {
      setNameError('')
    }

    // Validate: Subdomain must not be blank
    if (!subdomain.trim()) {
      setSubdomainError(t('errors.subdomainRequired'))
      hasError = true
    } else {
      setSubdomainError('')
    }

    // Validate: Domain must not be blank
    if (!domain.trim()) {
      setDomainError(t('errors.domainRequired'))
      hasError = true
    } else {
      setDomainError('')
    }

    // If any validation failed, stop here — do not proceed
    if (hasError) return

    // All fields are valid — start loading and save values
    setLoading(true)
    setInstallerValue('projectName', name)
    setInstallerValue('subdomain', subdomain)
    setInstallerValue('domain', domain)

    // Short delay before navigating so the spinner is visible to the user
    setTimeout(() => {
      router.push('/installer/admin')
    }, 500)
  }, [name, subdomain, domain, setInstallerValue, router, t])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      {/* ----------------------------------------------------------------
        * Locale Switcher
        * Fixed to the top-right corner of the screen so the user can
        * change their language at any point during the installer.
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header
        * Shows the platform logo and a one-line description.
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
        * Form Card
        * Contains the heading, description, all three inputs, and the
        * Continue button.
        * ---------------------------------------------------------------- */}
      <div className="w-full max-w-md space-y-6 p-6 sm:p-8 bg-gray-50 rounded-2xl shadow-xl border text-center">

        {/* Card title and subtitle */}
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {t('heading')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('subheading')}
        </p>

        <div className="space-y-4 text-left">

          {/* --------------------------------------------------------------
            * Project Name Field
            * A short, human-readable name for the project (e.g. "MyApp Studio").
            * Shows a red border and error message if left empty.
            * -------------------------------------------------------------- */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('fields.name.label')}
            </label>
            <Input
              placeholder={t('fields.name.placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={nameError ? 'border-red-500' : ''}
            />
            {nameError && (
              <p className="text-xs text-red-500 mt-1">{nameError}</p>
            )}
          </div>

          {/* --------------------------------------------------------------
            * Domain Field
            * The full URL the app will be served from.
            * Defaults to http://localhost:3000 for local development.
            * Shows a red border and error message if left empty.
            * -------------------------------------------------------------- */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('fields.domain.label')}
            </label>
            <Input
              placeholder={t('fields.domain.placeholder')}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={domainError ? 'border-red-500' : ''}
            />
            {domainError && (
              <p className="text-xs text-red-500 mt-1">{domainError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {t('fields.domain.hint')}{' '}
              <code>localhost:3000</code>.
            </p>
          </div>

          {/* --------------------------------------------------------------
            * Subdomain Field
            * The subdomain prefix used in the app URL
            * (e.g. "console" → console.yourdomain.com).
            * Shows a red border and error message if left empty.
            * -------------------------------------------------------------- */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('fields.subdomain.label')}
            </label>
            <Input
              placeholder={t('fields.subdomain.placeholder')}
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              className={subdomainError ? 'border-red-500' : ''}
            />
            {subdomainError && (
              <p className="text-xs text-red-500 mt-1">{subdomainError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {t('fields.subdomain.hint')}{' '}
              <code>{subdomain || 'console'}.yourdomain.com</code>
            </p>
          </div>

        </div>

        {/* ----------------------------------------------------------------
          * Continue Button
          * Disabled while loading to prevent duplicate submissions.
          * Shows a spinning loader icon while the navigation delay is active.
          * ---------------------------------------------------------------- */}
        <div className="pt-2">
          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              : t('continueButton')
            }
          </Button>
        </div>

      </div>
    </div>
  )
}