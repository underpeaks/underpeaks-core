/**
 * CompleteProfilePage.tsx
 * ------------------------
 * This page is shown to a user immediately after they first sign up or log in,
 * when they have not yet set up their workspace (called a "tenant").
 *
 * What is a "tenant"?
 * --------------------
 * In a multi-tenant CMS like NXTFlutter, each customer account is called a "tenant".
 * A tenant has its own subdomain (e.g. "myapp.nextflutter.com") and is isolated
 * from all other tenants. This page lets the user choose and register their subdomain.
 *
 * What does this page do?
 * ------------------------
 * 1. On load, it checks whether the current user already has a tenant set up.
 *    - If they do → redirect them straight to the console (no need to complete profile).
 *    - If they don't → show the form to choose a subdomain.
 * 2. When the user submits the form, it creates a new tenant record in the database
 *    using the provided database adapter, then redirects to the console.
 *
 * What is a "dbAdapter"?
 * -----------------------
 * NXTFlutter supports multiple databases (Supabase, Firebase, PostgreSQL, etc.).
 * The dbAdapter is an object that provides a consistent set of database functions
 * regardless of which database the user has chosen. This page uses two adapter methods:
 *  - findTenantByUserEmail() — checks if this user already has a tenant
 *  - createTenant()          — creates a new tenant record for this user
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ClipLoader } from 'react-spinners'
import type { DBAdapter, DBConfig } from '@/app/db-adapter/types'

/**
 * Props
 * -----
 * The data this component needs passed in from its parent.
 *
 * @prop dbAdapter  - The database adapter object for the user's chosen database type.
 *                    Provides methods like findTenantByUserEmail() and createTenant().
 * @prop dbConfig   - The configuration/connection details for the database
 *                    (e.g. connection string, API keys). Never logged or exposed.
 * @prop userEmail  - The email address of the currently logged-in user.
 *                    Used to look up and create their tenant record.
 */
interface Props {
  dbAdapter: DBAdapter
  dbConfig: DBConfig
  userEmail: string
}

/**
 * CompleteProfilePage
 * --------------------
 * The main component for the profile completion screen.
 * Rendered as a full-page centred card with a subdomain input form.
 */
export default function CompleteProfilePage({ dbAdapter, dbConfig, userEmail }: Props) {
  // The subdomain value the user types into the input field (e.g. "myapp")
  const [subdomain, setSubdomain] = useState('')

  // Whether the form submission is currently in progress.
  // Used to show a loading state on the button and prevent double-submits.
  const [loading, setLoading] = useState(false)

  // Tracks whether the user already has a tenant set up:
  //  - null  → we haven't checked yet (shows a loading spinner)
  //  - true  → tenant exists (user gets redirected to console)
  //  - false → no tenant yet (show the form)
  const [tenantExists, setTenantExists] = useState<boolean | null>(null)

  // Router is used to programmatically navigate the user to the console
  // once their profile is complete
  const router = useRouter()

  // Access translated strings for this page
  const t = useTranslations('completeProfile')

  // ─────────────────────────────────────────────
  // EFFECT: Check if tenant already exists on mount
  // ─────────────────────────────────────────────
  // This runs once when the component first loads (and again if any of the
  // dependencies change, though in practice they won't after initial render).
  // It checks the database to see if this user already has a tenant set up.
  useEffect(() => {
    const checkTenant = async () => {
      // Some database adapters might not implement findTenantByUserEmail yet.
      // If it's missing, we warn the developer and treat it as "no tenant found".
      if (!dbAdapter.findTenantByUserEmail) {
        console.warn(
          'CompleteProfilePage: findTenantByUserEmail is not implemented in the current DB adapter. ' +
          'Treating as no tenant found and showing the profile form.'
        )
        setTenantExists(false)
        return
      }

      try {
        // Ask the database adapter to look up a tenant for this user's email
        const tenant = await dbAdapter.findTenantByUserEmail(dbConfig, userEmail)

        // Convert the result to a boolean: if tenant is truthy, they already have one
        setTenantExists(!!tenant)

        // If they already have a tenant, redirect them to the console immediately
        if (tenant) router.push('/console')

      } catch (err) {
        // Log that a check failed without exposing raw DB error details to the console
        console.error('CompleteProfilePage: Failed to check tenant status for user. See server logs for details.')
        // Treat as no tenant found so the form is shown as a fallback
        setTenantExists(false)
      }
    }

    checkTenant()
  }, [dbAdapter, dbConfig, userEmail, router])

  // ─────────────────────────────────────────────
  // HANDLER: Form submission
  // ─────────────────────────────────────────────
  /**
   * handleSubmit
   * ------------
   * Called when the user clicks "Save & Continue".
   * Validates the input, then creates a new tenant in the database.
   * On success, redirects the user to the console.
   * On failure, shows an error alert.
   */
  const handleSubmit = async () => {
    // Validate: subdomain must not be empty
    if (!subdomain) return alert(t('validation.subdomainRequired'))

    // Validate: the adapter must support createTenant
    if (!dbAdapter.createTenant) return alert(t('validation.adapterMissingCreateTenant'))

    // Show loading state on the button while the request is in progress
    setLoading(true)

    try {
      // Create the tenant record in the database with the chosen subdomain
      // and the user's email address as the owner
      await dbAdapter.createTenant(dbConfig, {
        subdomain,
        user_email: userEmail,
      })

      // Success — navigate the user to their new console
      router.push('/console')

    } catch (err: any) {
      // Show a user-friendly error message if tenant creation fails
      alert(t('errors.saveFailed', { message: err.message || t('errors.unknownError') }))

    } finally {
      // Always hide the loading state when done, whether it succeeded or failed
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER: Loading state
  // ─────────────────────────────────────────────
  // While we're waiting for the tenant check to complete, show a full-screen spinner.
  // This prevents a flash of the form before we know whether to show it or redirect.
  if (tenantExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <ClipLoader color="#4B5563" size={48} aria-label={t('loading.checkingProfile')} />
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Profile completion form
  // ─────────────────────────────────────────────
  // Only shown when tenantExists === false (no tenant found for this user)
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <Card className="w-full max-w-md bg-white shadow-md border border-gray-300">
        <CardContent className="p-6">

          {/* Page heading */}
          <h1 className="text-2xl font-bold mb-2 text-center text-black">
            {t('title')}
          </h1>

          {/* Welcome message showing the user's email */}
          <p className="text-sm text-gray-700 mb-6 text-center">
            {t('welcome')}{' '}
            <strong>{userEmail}</strong>!
          </p>

          {/* Subdomain input field */}
          <div className="mb-4">
            <Label htmlFor="subdomain" className="text-gray-700 mb-1 block">
              {t('subdomain.label')}
            </Label>

            {/* Combined input + domain suffix display */}
            <div className="flex items-center rounded border border-gray-300 px-3 py-2 bg-white">
              <Input
                id="subdomain"
                placeholder={t('subdomain.placeholder')}
                className="border-none p-0 shadow-none text-black"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.trim())}
              />
              {/* Static domain suffix shown next to the input */}
              <span className="ml-2 text-sm text-gray-500">.nextflutter.com</span>
            </div>

            {/* Live preview of the full URL as the user types */}
            <p className="text-xs text-gray-500 mt-1">
              {t('subdomain.hint')}{' '}
              <span className="font-medium">
                https://{subdomain || t('subdomain.placeholder')}.nextflutter.com
              </span>
            </p>
          </div>

          {/* Submit button — disabled and shows translated text while loading */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-black text-white hover:bg-gray-900"
          >
            {loading ? t('button.saving') : t('button.save')}
          </Button>

        </CardContent>
      </Card>
    </div>
  )
}