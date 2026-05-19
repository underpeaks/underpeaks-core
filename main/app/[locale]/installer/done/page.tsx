/**
 * DonePage Component
 *
 * This is the final step of the NXTFlutter installer wizard.
 * It is shown after the installation process has completed successfully.
 *
 * What this page does:
 * - Displays a summary of everything the user configured during the
 *   installer: project name, stack, database, admin credentials, project
 *   type, and demo content preference.
 * - The admin password is masked for security — only the first and last
 *   characters are shown, with asterisks in between.
 * - Database config values are rendered in a formatted code block, with
 *   escaped newline characters (\n) converted to real line breaks for
 *   readability (useful for multi-line values like JSON keys or certs).
 * - Provides a "Continue to Sign In" button that navigates to /signin.
 *
 * Security note:
 * - The password is masked in the UI and is NEVER logged to the console.
 * - No sensitive config values (passwords, keys, tokens) are logged.
 */

'use client'

import { useRouter }           from 'next/navigation'
import { useTranslations }     from 'next-intl'
import { useInstallerStore }   from '../../../store/useInstallerStore'
import { Button }              from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
}                              from '@/components/ui/card'
import LocaleSwitcher          from '@/core/LocaleSwitcher'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DonePage
 *
 * The installation complete summary page. Reads all values from the
 * installer store and displays them in clearly labelled sections.
 * No state is managed here — everything is read-only from the store.
 */
export default function DonePage() {
  /**
   * t — Translation function scoped to the 'donePage' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('donePage')

  /**
   * router — Next.js router used to navigate to the sign-in page
   * when the user clicks "Continue to Sign In".
   */
  const router = useRouter()

  /**
   * Read all installer values from the global installer store.
   * These were set by the user across the various installer steps.
   */
  const {
    projectName,
    selectedStack,
    selectedDb,
    dbConfig,
    adminUser,
    demoContentEnabled,
    selectedProjectType,
  } = useInstallerStore()

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * maskedPassword
   *
   * Masks the admin password for safe display in the UI.
   * Shows only the first and last characters with asterisks in between.
   * Falls back to '********' if no password is set.
   *
   * Example: "MySecret123" → "M*********3"
   *
   * IMPORTANT: The raw password is never logged — only this masked
   * version is shown in the UI.
   */
  const maskedPassword = adminUser.password
    ? `${adminUser.password[0]}${'*'.repeat(adminUser.password.length - 2)}${adminUser.password.slice(-1)}`
    : '********'

  /**
   * formatStack
   *
   * Converts the internal stack identifier into a human-readable label.
   *
   * @param stack - The stack ID from the installer store.
   * @returns      A readable string like "Next.js + Flutter".
   */
  const formatStack = (stack: string) => {
    switch (stack) {
      case 'both':    return t('stack.both')
      case 'next':    return t('stack.next')
      case 'flutter': return t('stack.flutter')
      default:        return stack
    }
  }

  /**
   * normalizeValue
   *
   * Converts escaped newline characters (\n) in string values into
   * actual line breaks so they display correctly in the <pre> block.
   * Non-string values are returned unchanged.
   *
   * This is needed because some database config values (e.g. SSL certs
   * or JSON keys) are stored with literal \n characters.
   *
   * @param value - Any value from the dbConfig object.
   * @returns      The value with \n sequences replaced by real newlines.
   */
  const normalizeValue = (value: any) => {
    if (typeof value === 'string') {
      return value.replace(/\\n/g, '\n')
    }
    return value
  }

  /**
   * renderValue
   *
   * Renders a single database config value inside a styled code block.
   *
   * - If the value is an object, it is pretty-printed as JSON with each
   *   nested value also normalized for newlines.
   * - If the value is a string, it is displayed as-is after normalization.
   *
   * The outer div allows horizontal scrolling for very long values.
   *
   * @param value - The config value to render.
   * @returns      A JSX element containing the formatted value.
   */
  const renderValue = (value: any) => {
    const normalized = normalizeValue(value)

    return (
      <div className="max-w-full overflow-x-auto">
        <pre className="whitespace-pre-wrap break-all rounded bg-gray-100 p-3 text-xs font-mono">
          {typeof normalized === 'object'
            ? JSON.stringify(
                Object.fromEntries(
                  Object.entries(normalized).map(([k, v]) => [k, normalizeValue(v)])
                ),
                null,
                2
              )
            : normalized}
        </pre>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      {/* ------------------------------------------------------------------
        * Locale switcher — fixed in the top-right corner
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
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      {/* ------------------------------------------------------------------
        * Installation Summary Card
        * Divided into clearly separated sections, one per config area.
        * ------------------------------------------------------------------ */}
      <Card className="w-full max-w-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {t('installComplete')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-gray-800">

          {/* --------------------------------------------------------------
            * Project Info
            * Shows the project name and selected technology stack.
            * -------------------------------------------------------------- */}
          <section>
            <h3 className="font-semibold text-lg">{t('projectInfo.title')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('projectInfo.subtitle')}</p>
            <p>
              <strong>{t('projectInfo.name')}</strong>{' '}
              {projectName || '—'}
            </p>
            <p>
              <strong>{t('projectInfo.stack')}</strong>{' '}
              {formatStack(selectedStack)}
            </p>
          </section>

          <hr className="border-gray-300" />

          {/* --------------------------------------------------------------
            * Database Info
            * Shows the selected database type and any config key/value pairs.
            * Config values are rendered in formatted code blocks.
            * -------------------------------------------------------------- */}
          <section>
            <h3 className="font-semibold text-lg">{t('database.title')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('database.subtitle')}</p>
            <p>
              <strong>{t('database.type')}</strong>{' '}
              {selectedDb || t('database.noneSelected')}
            </p>

            {/* Render each db config key/value pair if config exists */}
            {dbConfig && Object.keys(dbConfig).length > 0 && (
              <div className="mt-4 space-y-4 max-w-{500} w-fit">
                {Object.entries(dbConfig).map(([key, value]) => (
                  <div key={key}>
                    <div className="text-sm font-semibold text-gray-700">
                      {key}
                    </div>
                    {renderValue(value)}
                  </div>
                ))}
              </div>
            )}
          </section>

          <hr className="border-gray-300" />

          {/* --------------------------------------------------------------
            * Admin User
            * Shows the admin's full name, email, and masked password.
            * The raw password is NEVER shown or logged.
            * -------------------------------------------------------------- */}
          <section>
            <h3 className="font-semibold text-lg">{t('adminUser.title')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('adminUser.subtitle')}</p>
            <p>
              <strong>{t('adminUser.name')}</strong>{' '}
              {adminUser.fullName}
            </p>
            <p>
              <strong>{t('adminUser.email')}</strong>{' '}
              {adminUser.email}
            </p>
            <p>
              <strong>{t('adminUser.password')}</strong>{' '}
              {maskedPassword}
            </p>
          </section>

          <hr className="border-gray-300" />

          {/* --------------------------------------------------------------
            * Selected Project Type
            * Shows the project template the user chose (e.g. "ecommerce").
            * -------------------------------------------------------------- */}
          <section>
            <h3 className="font-semibold text-lg">{t('projectType.title')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('projectType.subtitle')}</p>
            <p className="font-medium text-black">
              {selectedProjectType || '—'}
            </p>
          </section>

          <hr className="border-gray-300" />

          {/* --------------------------------------------------------------
            * Demo Content
            * Shows whether demo/sample data was installed.
            * -------------------------------------------------------------- */}
          <section>
            <h3 className="font-semibold text-lg">{t('demoContent.title')}</h3>
            <p className="text-sm text-gray-500 mb-2">{t('demoContent.subtitle')}</p>
            <p>
              {demoContentEnabled
                ? t('demoContent.installed')
                : t('demoContent.notInstalled')
              }
            </p>
          </section>

        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------
        * Continue to Sign In button
        * Full-width, navigates to /signin after the installer is complete.
        * ------------------------------------------------------------------ */}
      <div className="w-full max-w-xl mt-8">
        <Button
          className="w-full"
          onClick={() => router.push('/signin')}
        >
          {t('continueButton')}
        </Button>
      </div>

    </div>
  )
}