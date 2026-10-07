// DonePage.tsx  (installer step 8: summary + continue to sign in)
'use client'

import { useState }               from 'react'
import { useRouter }              from 'next/navigation'
import { useTranslations }        from 'next-intl'
import { useInstallerStore }      from '../../../store/useInstallerStore'
import { Button }                 from '@/components/ui/button'
import { CheckCircle2, Eye, EyeOff, TriangleAlert } from 'lucide-react'
import InstallerShell, { CARD, PRIMARY_BUTTON, TOTAL_STEPS } from '@/core/InstallerShell'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Config keys whose values are secrets and must be hidden until revealed. */
const SENSITIVE_KEY = /pass|secret|key|token|connection|private|json|credential/i

/** Converts literal \n sequences into real line breaks for display. */
const normalizeValue = (value: any) =>
  typeof value === 'string' ? value.replace(/\\n/g, '\n') : value

const toDisplayString = (value: any): string => {
  const normalized = normalizeValue(value)
  if (normalized && typeof normalized === 'object') {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(normalized).map(([k, v]) => [k, normalizeValue(v)])
      ),
      null,
      2
    )
  }
  return String(normalized ?? '')
}

/** One database config entry. Secret values are hidden until "Show" is clicked. */
function ConfigRow({ name, value }: { name: string; value: any }) {
  const sensitive = SENSITIVE_KEY.test(name)
  const [revealed, setRevealed] = useState(!sensitive)

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-700">{name}</span>
        {sensitive && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <div className="max-w-full overflow-x-auto">
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-neutral-100 p-3 font-mono text-xs text-neutral-800">
          {revealed ? toDisplayString(value) : '••••••••••••'}
        </pre>
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mb-3 text-sm text-neutral-500">{subtitle}</p>
      <div className="space-y-1 text-sm text-neutral-800">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DonePage() {
  const t      = useTranslations('donePage')
  const router = useRouter()

  const {
    projectName,
    selectedStack,
    selectedDb,
    dbConfig,
    adminUser,
    demoContentEnabled,
    selectedProjectType,
  } = useInstallerStore()

  const maskedPassword =
    adminUser.password && adminUser.password.length > 2
      ? `${adminUser.password[0]}${'*'.repeat(adminUser.password.length - 2)}${adminUser.password.slice(-1)}`
      : '********'

  const formatStack = (stack: string) => {
    switch (stack) {
      case 'both':    return t('stack.both')
      case 'next':    return t('stack.next')
      case 'flutter': return t('stack.flutter')
      default:        return stack
    }
  }

  const onLocalhost =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'

  return (
    <InstallerShell step={TOTAL_STEPS} width="md" logoAlt={t('logoAlt')} tagline={t('tagline')}>

      <div className={CARD}>

        {/* Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{t('installComplete')}</h1>
        </div>

        <div className="divide-y divide-neutral-200">

          <Section title={t('projectInfo.title')} subtitle={t('projectInfo.subtitle')}>
            <p><strong>{t('projectInfo.name')}</strong> {projectName || '—'}</p>
            <p><strong>{t('projectInfo.stack')}</strong> {formatStack(selectedStack)}</p>
          </Section>

          <Section title={t('database.title')} subtitle={t('database.subtitle')}>
            <p><strong>{t('database.type')}</strong> {selectedDb || t('database.noneSelected')}</p>

            {dbConfig && Object.keys(dbConfig).length > 0 && (
              <div className="mt-3 space-y-4">
                {Object.entries(dbConfig).map(([key, value]) => (
                  <ConfigRow key={key} name={key} value={value} />
                ))}
              </div>
            )}
          </Section>

          <Section title={t('adminUser.title')} subtitle={t('adminUser.subtitle')}>
            <p><strong>{t('adminUser.name')}</strong> {adminUser.fullName}</p>
            <p><strong>{t('adminUser.email')}</strong> {adminUser.email}</p>
            <p><strong>{t('adminUser.password')}</strong> {maskedPassword}</p>
          </Section>

          <Section title={t('projectType.title')} subtitle={t('projectType.subtitle')}>
            <p className="font-medium text-black">{selectedProjectType || '—'}</p>
          </Section>

          <Section title={t('demoContent.title')} subtitle={t('demoContent.subtitle')}>
            <p>
              {demoContentEnabled
                ? t('demoContent.installed')
                : t('demoContent.notInstalled')}
            </p>
          </Section>

        </div>
      </div>

      {/* Localhost restart notice */}
      {onLocalhost && (
        <div className="mt-6 flex gap-3 rounded-xl border border-neutral-300 bg-neutral-100 px-5 py-4 text-sm text-neutral-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="mb-1 font-semibold">Before you continue</p>
            <p className="leading-relaxed">
              You are running on{' '}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">localhost</code>.
              Please <strong>stop your dev server and restart it</strong> before
              clicking &quot;Continue to Sign In&quot;. The installer has written new
              environment values that only take effect after a fresh server start.
            </p>
          </div>
        </div>
      )}

      <Button
        className={`${PRIMARY_BUTTON} mt-8 w-full`}
        onClick={() => router.push('/signin')}
      >
        {t('continueButton')}
      </Button>

    </InstallerShell>
  )
}