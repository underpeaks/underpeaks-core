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
  const router = useRouter()
  const { setInstallerValue } = useInstallerStore()
  const t = useTranslations('projectInfoPage')

  // -------------------------------------------------------------------------
  // Form field state
  // -------------------------------------------------------------------------

  const [name, setName]           = useState('')
  const [subdomain, setSubdomain] = useState('console')
  const [domain, setDomain]       = useState('http://localhost:3000')
  const [loading, setLoading]     = useState(false)

  // -------------------------------------------------------------------------
  // Validation error state
  // -------------------------------------------------------------------------

  const [nameError, setNameError]           = useState('')
  const [subdomainError, setSubdomainError] = useState('')
  const [domainError, setDomainError]       = useState('')

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleNameChange
   *
   * Strips any character that is not a lowercase letter as the user types.
   * This means numbers, spaces, uppercase letters, hyphens, and all special
   * characters are silently removed — the user simply cannot enter them.
   */
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitised = e.target.value.replace(/[^a-z]/g, '')
    setName(sanitised)
  }, [])

  /**
   * handleContinue
   *
   * Called when the user clicks the "Continue" button.
   *
   * Steps:
   * 1. Validates all three fields — sets individual error messages if any
   *    field is empty or invalid. If any field fails validation, stops early.
   * 2. Enables the loading spinner on the button.
   * 3. Saves all three values to the global installer store.
   * 4. After a short 500ms delay, navigates to /installer/admin.
   */
  const handleContinue = useCallback(() => {
    let hasError = false

    // Validate: Project Name must not be blank and must be lowercase letters only
    if (!name.trim()) {
      setNameError(t('errors.nameRequired'))
      hasError = true
    } else if (!/^[a-z]+$/.test(name)) {
      setNameError(t('errors.nameInvalid'))
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

    if (hasError) return

    setLoading(true)
    setInstallerValue('projectName', name)
    setInstallerValue('subdomain', subdomain)
    setInstallerValue('domain', domain)

    setTimeout(() => {
      router.push('/installer/admin')
    }, 500)
  }, [name, subdomain, domain, setInstallerValue, router, t])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/NXT_Flutter_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      <div className="w-full max-w-md space-y-6 p-6 sm:p-8 bg-gray-50 rounded-2xl shadow-xl border text-center">

        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {t('heading')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('subheading')}
        </p>

        <div className="space-y-4 text-left">

          {/* --------------------------------------------------------------
            * Project Name Field
            * Lowercase letters only — numbers, spaces, and special characters
            * are stripped silently as the user types. A hint below the input
            * makes the rule clear upfront so it doesn't surprise anyone.
            * -------------------------------------------------------------- */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t('fields.name.label')}
            </label>
            <Input
              placeholder={t('fields.name.placeholder')}
              value={name}
              onChange={handleNameChange}
              className={nameError ? 'border-red-500' : ''}
            />
            {nameError && (
              <p className="text-xs text-red-500 mt-1">{nameError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {t('fields.name.hint')}
            </p>
          </div>

          {/* Domain Field */}
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

          {/* Subdomain Field */}
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