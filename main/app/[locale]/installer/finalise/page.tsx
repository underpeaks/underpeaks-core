// FinalizePage.tsx  (installer step 7: summary + run installation)
'use client'

import { useState, useMemo }        from 'react'
import { useTranslations }          from 'next-intl'
import { Button }                   from '@/components/ui/button'
import { useRouter }                from 'next/navigation'
import { CheckCircle2 }             from 'lucide-react'
import { INSTALL_STEPS, runInstallerSteps } from '../actions/installerRunner'
import { useInstallerStore }        from '../../../store/useInstallerStore'
import InstallerShell, { CARD, PRIMARY_BUTTON } from '@/core/InstallerShell'

export default function FinalizePage() {
  const router = useRouter()
  const t      = useTranslations('finalizePage')

  const selectedStack  = useInstallerStore((state) => state.selectedStack)
  const installerState = useInstallerStore((state) => state)

  const [installing,       setInstalling]       = useState(false)
  const [progress,         setProgress]         = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [errorMessage,     setErrorMessage]     = useState<string | null>(null)

  /** Marks steps that do not apply to the selected stack as skipped. */
  const stepLabels = useMemo(() => {
    return INSTALL_STEPS.map((step) => {
      if (
        step === 'Installing Flutter project' &&
        selectedStack !== 'flutter' &&
        selectedStack !== 'both'
      ) {
        return { label: step, skipped: true }
      }
      if (
        step === 'Installing Next.js project' &&
        selectedStack !== 'next' &&
        selectedStack !== 'both'
      ) {
        return { label: step, skipped: true }
      }
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

  async function startInstall() {
    setInstalling(true)
    setErrorMessage(null)

    try {
      await runInstallerSteps((stepIndex) => {
        setProgress((stepIndex / INSTALL_STEPS.length) * 100)
        setCurrentStepIndex(stepIndex - 1)
      })

      if (!installerState.selectedDb) {
        throw new Error(t('errors.noDatabase'))
      }

      console.log(t('logs.sendingConfig'))

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

      router.push('/installer/done')
    } catch (error: unknown) {
      setInstalling(false)

      let message = t('errors.unknown')
      if (error instanceof Error)         message = error.message
      else if (typeof error === 'string') message = error

      setErrorMessage(message)
      console.error(t('logs.installError'), message)
    }
  }

  const summary = [
    { label: t('summary.project'),  value: installerState.projectName || t('summary.defaultProject') },
    { label: t('summary.stack'),    value: selectedStack === 'both' ? t('summary.stackBoth') : selectedStack },
    { label: t('summary.database'), value: installerState.selectedDb || t('summary.notSelected') },
  ]

  return (
    <InstallerShell step={7} width="sm" logoAlt={t('logoAlt')} tagline={t('tagline')}>
      <div className={CARD}>

        <h1 className="text-2xl font-semibold tracking-tight">{t('card.title')}</h1>

        {/* Summary */}
        <dl className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-neutral-50 text-sm">
          {summary.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="font-medium text-neutral-600">{row.label}</dt>
              <dd className="font-mono text-neutral-900">{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* Steps */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-neutral-500">
            {t('steps.heading')}
          </h2>
          <ul className="space-y-2.5">
            {stepLabels.map(({ label, skipped }, i) => {
              const done      = i < currentStepIndex || progress === 100
              const isCurrent = i === currentStepIndex && progress < 100 && installing

              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 text-sm ${
                    done ? 'font-medium text-neutral-900' : 'text-neutral-500'
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-black" />
                  ) : (
                    <span
                      className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 ${
                        isCurrent
                          ? 'animate-pulse border-black bg-black'
                          : 'border-neutral-300'
                      }`}
                    />
                  )}
                  <span className="flex flex-wrap items-center gap-2">
                    {label}
                    {skipped && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                        {t('steps.skipped')}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Progress */}
        <div className="mt-8">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 min-h-[1.5rem] text-center text-sm font-medium text-neutral-700">
            {installing
              ? (INSTALL_STEPS[currentStepIndex] ?? t('progress.finishing'))
              : t('progress.ready')}
          </p>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mt-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-4 font-mono text-sm text-red-700">
            <strong>{t('errors.label')}</strong> {errorMessage}
          </div>
        )}

        {/* Action */}
        <Button
          className={`${PRIMARY_BUTTON} mt-6 w-full`}
          onClick={startInstall}
          disabled={installing}
        >
          {installing ? t('button.installing') : t('button.start')}
        </Button>

      </div>
    </InstallerShell>
  )
}