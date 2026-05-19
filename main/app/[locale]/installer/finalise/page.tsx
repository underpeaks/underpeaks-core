/**
 * FinalizePage Component
 *
 * This is the final configuration step of the multi-step installer wizard.
 * It gives the user a summary of their chosen settings and then runs the
 * full installation process when they click "Start Installation".
 *
 * What this page does:
 * - Displays a summary card showing the project name, chosen stack, and database.
 * - Shows a live checklist of all installation steps, highlighting the current
 *   step with a pulsing dot and marking completed steps with a green tick.
 * - Steps that don't apply to the selected stack are automatically marked as
 *   "skipped" so the user knows they were intentionally bypassed.
 * - Runs the installer steps via `runInstallerSteps`, then POSTs the full
 *   installer configuration to the server's /api/save-config endpoint.
 * - Animates a striped progress bar that fills as each step completes.
 * - On success, navigates to /installer/done.
 * - On failure, displays a clear error message in a red box.
 *
 * Component hierarchy:
 *   FinalizePage     ← this file (owns all state + install logic)
 *   ├── LocaleSwitcher  ← floating language switcher (top-right)
 *   ├── Card            ← summary + steps + progress UI
 *   │   ├── ProgressBar ← animated striped bar (defined at bottom of this file)
 *   │   └── Button      ← "Start Installation" / "Installing..."
 */

'use client'

import { useState, useMemo }      from 'react'
import { useTranslations }        from 'next-intl'
import { Button }                 from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useRouter }              from 'next/navigation'
import { CheckCircle2 }           from 'lucide-react'
import { INSTALL_STEPS, runInstallerSteps } from '../actions/installerRunner'
import { useInstallerStore }      from '../../../store/useInstallerStore'
import LocaleSwitcher             from '@/core/LocaleSwitcher'

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * FinalizePage
 *
 * The last wizard step before the project is generated. Collects all previously
 * stored installer state from Zustand, shows a summary, and triggers the
 * install + save-config flow.
 */
export default function FinalizePage() {
  /**
   * router — Next.js router for navigating to /installer/done on success.
   */
  const router = useRouter()

  /**
   * t — Translation function scoped to the 'finalizePage' namespace.
   * Use t('someKey') to retrieve the translated string for that key.
   */
  const t = useTranslations('finalizePage')

  /**
   * selectedStack — The technology stack the user chose earlier in the wizard
   * (e.g. 'flutter', 'next', 'cms', or 'both').
   * Used to decide which installation steps should be skipped.
   */
  const selectedStack   = useInstallerStore((state) => state.selectedStack)

  /**
   * installerState — The full Zustand installer store snapshot.
   * Contains projectName, subdomain, selectedDb, dbConfig, adminUser, etc.
   * Everything needed to POST to /api/save-config.
   */
  const installerState  = useInstallerStore((state) => state)

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /**
   * installing — True while the install process is running.
   * Disables the button and shows "Installing..." text.
   */
  const [installing, setInstalling]         = useState(false)

  /**
   * progress — A number from 0–100 representing overall install progress.
   * Drives the width of the ProgressBar.
   */
  const [progress, setProgress]             = useState(0)

  /**
   * currentStepIndex — The index (0-based) of the step currently executing.
   * Used to highlight the active step in the checklist.
   */
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  /**
   * errorMessage — Set to a string when any part of the install fails.
   * Null means no error is shown. Displayed in a red error box.
   */
  const [errorMessage, setErrorMessage]     = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Derived data — step labels with skipped logic
  // -------------------------------------------------------------------------

  /**
   * stepLabels — A memoised array derived from INSTALL_STEPS.
   *
   * Each entry is an object: { label: string, skipped: boolean }
   *
   * A step is marked as `skipped: true` when it belongs to a stack the user
   * did NOT select. For example, if the user chose 'next', the Flutter step
   * is irrelevant and gets skipped automatically.
   *
   * We use `useMemo` here so this calculation only re-runs when `selectedStack`
   * changes, not on every render — a small but good performance habit.
   */
  const stepLabels = useMemo(() => {
    return INSTALL_STEPS.map((step) => {
      // Skip the Flutter step if the user didn't choose flutter or both
      if (
        step === 'Installing Flutter project' &&
        selectedStack !== 'flutter' &&
        selectedStack !== 'both'
      ) {
        return { label: step, skipped: true }
      }
      // Skip the Next.js step if the user didn't choose next or both
      if (
        step === 'Installing Next.js project' &&
        selectedStack !== 'next' &&
        selectedStack !== 'both'
      ) {
        return { label: step, skipped: true }
      }
      // Skip the CMS step if the user didn't choose cms or both
      if (
        step === 'Installing CMS project' &&
        selectedStack !== 'cms' &&
        selectedStack !== 'both'
      ) {
        return { label: step, skipped: true }
      }
      return { label: step, skipped: false }
    })
  }, [selectedStack])

  // -------------------------------------------------------------------------
  // Install handler
  // -------------------------------------------------------------------------

  /**
   * startInstall
   *
   * Called when the user clicks "Start Installation".
   *
   * Steps:
   * 1. Sets `installing` to true and clears any previous error.
   * 2. Calls `runInstallerSteps` — an async function that executes each
   *    installation step one-by-one. On each step, we update `progress` and
   *    `currentStepIndex` so the checklist and progress bar stay in sync.
   * 3. Guards against a missing database selection (required by the server).
   * 4. POSTs the full installer configuration to /api/save-config. The server
   *    uses this payload to create the project directory and encrypt any secrets.
   * 5. On success, navigates to /installer/done.
   * 6. On failure, re-enables the button and shows the error message.
   */
  async function startInstall() {
    setInstalling(true)
    setErrorMessage(null)

    try {
      // Run each installation step; callback fires after every completed step
      await runInstallerSteps((stepIndex) => {
        setProgress((stepIndex / INSTALL_STEPS.length) * 100)
        setCurrentStepIndex(stepIndex - 1)
      })

      // Guard: a database must be selected before we can save the config
      if (!installerState.selectedDb) {
        throw new Error(t('errors.noDatabase'))
      }

      console.log(t('logs.sendingConfig'))

      // POST the installer configuration to the server
      const res = await fetch('/api/save-config', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName:         installerState.projectName,
          subdomain:           installerState.subdomain,
          selectedStack:       installerState.selectedStack,
          selectedDb:          installerState.selectedDb,
          dbConfig:            installerState.dbConfig,
          selectedProjectType: installerState.selectedProjectType,
          databaseName:        installerState.dbConfig.database,
          adminUser: installerState.adminUser
            ? {
                email:     installerState.adminUser.email,
                full_name: installerState.adminUser.fullName,
              }
            : null,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || t('errors.saveFailed'))
      }

      console.log(t('logs.configSaved'))

      // Navigate to the completion page
      router.push('/installer/done')
    } catch (error: unknown) {
      setInstalling(false)

      // Normalise the error into a plain string for display
      let message = t('errors.unknown')
      if (error instanceof Error)    message = error.message
      else if (typeof error === 'string') message = error

      setErrorMessage(message)
      console.error(t('logs.installError'), message)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-xl mx-auto px-6 py-12 space-y-8">

      {/* ----------------------------------------------------------------
        * Locale Switcher
        * Fixed in the top-right corner so the user can switch language
        * at any time during the installer.
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header
        * Logo and tagline consistent with the rest of the installer wizard.
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
        * Main Card
        * Contains the project summary, step checklist, progress bar,
        * error display, and the Start / Installing button.
        * ---------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t('card.title')}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* --------------------------------------------------------------
            * Project Summary
            * A monospaced "terminal-style" box showing the key choices the
            * user made in earlier wizard steps.
            * -------------------------------------------------------------- */}
          <div className="bg-gray-100 text-gray-900 p-4 rounded-md space-y-1 font-mono text-sm border border-gray-300">
            <p>
              <strong>{t('summary.project')}</strong>{' '}
              {installerState.projectName || t('summary.defaultProject')}
            </p>
            <p>
              <strong>{t('summary.stack')}</strong>{' '}
              {selectedStack === 'both'
                ? t('summary.stackBoth')
                : selectedStack}
            </p>
            <p>
              <strong>{t('summary.database')}</strong>{' '}
              {installerState.selectedDb || t('summary.notSelected')}
            </p>
          </div>

          {/* --------------------------------------------------------------
            * Installation Steps Checklist
            * Iterates over stepLabels and shows:
            *  - A green CheckCircle2 for completed steps
            *  - A pulsing filled dot for the current step
            *  - An empty circle for upcoming steps
            *  - A green "skipped!" badge for irrelevant steps
            * -------------------------------------------------------------- */}
          <div className="bg-gray-50 border border-gray-300 rounded-md p-4 text-gray-700 text-sm">
            <h3 className="font-semibold mb-2">{t('steps.heading')}</h3>
            <ul className="list-disc list-inside space-y-2">
              {stepLabels.map(({ label, skipped }, i) => {
                // A step is "done" if we've passed it, or if the install finished (100%)
                const done      = i < currentStepIndex || progress === 100
                // A step is "current" if we're on it and not yet finished
                const isCurrent = i === currentStepIndex && progress < 100

                return (
                  <li
                    key={label}
                    className={`flex items-center space-x-2 ${
                      done ? 'text-gray-900 font-semibold' : 'text-gray-600'
                    }`}
                  >
                    {/* Step status indicator */}
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <span
                        className={`inline-block w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          isCurrent
                            ? 'border-gray-900 bg-gray-900 animate-pulse'
                            : 'border-gray-400'
                        }`}
                      />
                    )}

                    {/* Step label + optional "skipped" badge */}
                    <span>
                      {label}
                      {skipped && (
                        <span className="text-green-600 font-semibold ml-2 inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t('steps.skipped')}</span>
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* --------------------------------------------------------------
            * Progress Bar + Status Text
            * Bar fills as steps complete. Text below shows the current step
            * name or a "Ready to install" message before install starts.
            * -------------------------------------------------------------- */}
          <div>
            <ProgressBar progress={progress} />
            <p className="mt-3 text-center text-gray-700 font-medium min-h-[1.5rem]">
              {installing
                ? (INSTALL_STEPS[currentStepIndex] ?? t('progress.finishing'))
                : t('progress.ready')}
            </p>
          </div>

          {/* --------------------------------------------------------------
            * Error Message Box
            * Only rendered when errorMessage is non-null.
            * Uses a red background and monospaced font for clarity.
            * -------------------------------------------------------------- */}
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md font-mono whitespace-pre-wrap mt-2">
              <strong>{t('errors.label')}</strong> {errorMessage}
            </div>
          )}

          {/* --------------------------------------------------------------
            * Action Button
            * Shows "Start Installation" before install begins.
            * Switches to a disabled "Installing..." button while running.
            * -------------------------------------------------------------- */}
          <div className="flex justify-end">
            {!installing ? (
              <Button onClick={startInstall}>{t('button.start')}</Button>
            ) : (
              <Button disabled>{t('button.installing')}</Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ProgressBar Component
// ---------------------------------------------------------------------------

/**
 * ProgressBar
 *
 * A purely visual, animated progress bar component.
 *
 * Props:
 * - progress: number — A value from 0 to 100 representing completion percentage.
 *
 * How it works:
 * - The outer div is a fixed-height container with a light gray background.
 * - The inner div's width is set dynamically via the `style` prop to match
 *   the `progress` value (e.g., progress=50 → width: "50%").
 * - A CSS `transition` makes the bar grow smoothly instead of jumping.
 * - The striped gradient pattern (black, grey, white, green) gives it a
 *   retro "construction zone" look, consistent with an active install process.
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full h-12 rounded-xl overflow-hidden border border-gray-500 bg-gray-200 shadow-inner">
      <div
        className="h-full transition-all duration-100 ease-linear"
        style={{
          width: `${progress}%`,
          background: `repeating-linear-gradient(
            45deg,
            #000000cc,
            #000000cc 12px,
            #888888cc 12px,
            #888888cc 12px,
            #ffffffcc 12px,
            #ffffffcc 18px,
            #22c55ecc 6px,
            #22c55ecc 12px
          )`,
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  )
}