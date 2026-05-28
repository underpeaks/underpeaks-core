'use client'

import { useTranslations } from 'next-intl'
import { FiLock }          from 'react-icons/fi'
import { useTheme } from '../../../ThemeContext'


// ---------------------------------------------------------------------------
// Flag definitions
// ---------------------------------------------------------------------------

type FlagDef = {
  id:          string
  label:       string
  description: string
  paid?:       boolean
  type?:       'toggle' | 'select'
  options?:    { value: string; label: string }[]
}

type FlagGroup = {
  group: string
  flags: FlagDef[]
}

const FLAG_GROUPS: FlagGroup[] = [
  {
    group: 'Flutter Code Generation',
    flags: [
      {
        id: 'flutter-state', label: 'State Management', type: 'select',
        description: 'Which state management library to use in generated Flutter code',
        options: [
          { value: 'riverpod', label: 'Riverpod (recommended)' },
          { value: 'provider',  label: 'Provider'               },
          { value: 'getx',      label: 'GetX'                   },
          { value: 'bloc',      label: 'BLoC'                   },
          { value: 'mobx',      label: 'MobX'                   },
        ],
      },
    ],
  },
  {
    group: 'Next.js Code Generation',
    flags: [
      {
        id: 'nextjs-router', label: 'Router', type: 'select',
        description: 'Which Next.js router to use in generated code',
        options: [
          { value: 'app-router',    label: 'App Router (recommended)' },
          { value: 'pages-router',  label: 'Pages Router'             },
        ],
      },
      {
        id: 'nextjs-state', label: 'State Management', type: 'select',
        description: 'Which state library to use in generated Next.js code',
        options: [
          { value: 'zustand',       label: 'Zustand (recommended)' },
          { value: 'redux-toolkit', label: 'Redux Toolkit'         },
          { value: 'jotai',         label: 'Jotai'                 },
          { value: 'react-query',   label: 'React Query'           },
          { value: 'trpc',          label: 'tRPC'                  },
        ],
      },
    ],
  },
  {
    group: 'Appearance',
    flags: [
      { id: 'dark-mode',    label: 'Dark Mode',          description: 'Allow users to switch between light and dark themes' },
      { id: 'system-theme', label: 'Follow System Theme', description: 'Automatically match device light/dark mode'         },
    ],
  },
  {
    group: 'Localisation',
    flags: [
      { id: 'multi-language', label: 'Multi-language Support', description: 'Enable multiple language support' },
      { id: 'rtl-support',    label: 'RTL Support',            description: 'Right-to-left layout support'    },
    ],
  },
  {
    group: 'App Behaviour',
    flags: [
      { id: 'offline-mode',       label: 'Offline Mode',       description: 'Cache data locally for offline use'                },
      { id: 'push-notifications', label: 'Push Notifications', description: 'Enable push notification support via FCM'          },
      { id: 'splash-screen',      label: 'Splash Screen',      description: 'Show a branded splash screen on app launch'        },
      { id: 'onboarding',         label: 'Onboarding Flow',    description: 'Show a welcome flow for new users'                 },
    ],
  },
  {
    group: 'Authentication — Paid',
    flags: [
      { id: '2fa',          label: 'Two-Factor Authentication', description: 'Require OTP or authenticator app',          paid: true },
      { id: 'biometric',    label: 'Biometric Login',           description: 'Fingerprint and Face ID login on mobile',   paid: true },
      { id: 'social-login', label: 'Social Login',              description: 'Google, GitHub, Apple and Facebook OAuth',  paid: true },
      { id: 'magic-link',   label: 'Magic Link',                description: 'Passwordless login via email link',         paid: true },
      { id: 'sso',          label: 'SSO / SAML',                description: 'Enterprise single sign-on integration',     paid: true },
    ],
  },
  {
    group: 'Advanced — Paid',
    flags: [
      { id: 'analytics',      label: 'In-app Analytics', description: 'Track screen views and events',            paid: true },
      { id: 'ab-testing',     label: 'A/B Testing',       description: 'Run feature experiments',                 paid: true },
      { id: 'feature-gating', label: 'Feature Gating',    description: 'Show or hide features by user plan/role', paid: true },
    ],
  },
  
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeatureFlagsPage() {
  const t = useTranslations('featureFlagsPage')
  const { theme, setFlags, saveTheme, saving, saved, error } = useTheme()
  const flags = theme.flags

  const toggle = (id: string) => {
    setFlags({ ...flags, [id]: !flags[id] })
  }

  const select = (id: string, value: string) => {
    setFlags({ ...flags, [id]: value })
  }

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h2 className="text-base font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-xs text-gray-400 mt-1">{t('subheading')}</p>
      </div>

      {FLAG_GROUPS.map((group) => (
        <div key={group.group} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {group.group}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {group.flags.map((flag) => (
              <div key={flag.id} className="flex items-center gap-4 px-5 py-3.5">

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{flag.label}</p>
                    {flag.paid && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-bold rounded uppercase">
                        <FiLock size={8} /> {t('paidBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{flag.description}</p>
                </div>

                {/* Select type */}
                {flag.type === 'select' && flag.options ? (
                  <select
                    value={(flags[flag.id] as string) ?? flag.options[0].value}
                    onChange={(e) => select(flag.id, e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                  >
                    {flag.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  /* Toggle type */
                  <button
                    onClick={() => flag.paid ? null : toggle(flag.id)}
                    disabled={flag.paid}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                      flag.paid
                        ? 'bg-gray-200 cursor-not-allowed opacity-50'
                        : flags[flag.id]
                          ? 'bg-gray-900'
                          : 'bg-gray-300'
                    }`}
                    title={flag.paid ? 'Available on hosted plan' : undefined}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      flags[flag.id] && !flag.paid ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                )}

              </div>
            ))}
          </div>
        </div>
      ))}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={saveTheme}
        disabled={saving}
        className="self-start px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 transition"
      >
        {saved ? t('savedMessage') : saving ? t('saveButtonSaving') : t('saveButtonIdle')}
      </button>
    </div>
  )
}