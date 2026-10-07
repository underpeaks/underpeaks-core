// File: (same path as the Feature Flags page you pasted, replace the whole file)
'use client'

import { useTranslations } from 'next-intl'
import { FiLock }          from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Flag definitions (display only, nothing here is saved or applied yet)
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
      { id: 'dark-mode',    label: 'Dark Mode',           description: 'Allow users to switch between light and dark themes' },
      { id: 'system-theme', label: 'Follow System Theme', description: 'Automatically match device light/dark mode'          },
    ],
  },
  {
    group: 'Localisation',
    flags: [
      { id: 'multi-language', label: 'Multi-language Support', description: 'Enable multiple language support' },
      { id: 'rtl-support',    label: 'RTL Support',            description: 'Right-to-left layout support'     },
    ],
  },
  {
    group: 'App Behaviour',
    flags: [
      { id: 'offline-mode',       label: 'Offline Mode',       description: 'Cache data locally for offline use'          },
      { id: 'push-notifications', label: 'Push Notifications', description: 'Enable push notification support via FCM'    },
      { id: 'splash-screen',      label: 'Splash Screen',      description: 'Show a branded splash screen on app launch'  },
      { id: 'onboarding',         label: 'Onboarding Flow',    description: 'Show a welcome flow for new users'           },
    ],
  },
  {
    group: 'Authentication — Paid',
    flags: [
      { id: '2fa',          label: 'Two-Factor Authentication', description: 'Require OTP or authenticator app',         paid: true },
      { id: 'biometric',    label: 'Biometric Login',           description: 'Fingerprint and Face ID login on mobile',  paid: true },
      { id: 'social-login', label: 'Social Login',              description: 'Google, GitHub, Apple and Facebook OAuth', paid: true },
      { id: 'magic-link',   label: 'Magic Link',                description: 'Passwordless login via email link',        paid: true },
      { id: 'sso',          label: 'SSO / SAML',                description: 'Enterprise single sign-on integration',    paid: true },
    ],
  },
  {
    group: 'Advanced — Paid',
    flags: [
      { id: 'analytics',      label: 'In-app Analytics', description: 'Track screen views and events',            paid: true },
      { id: 'ab-testing',     label: 'A/B Testing',      description: 'Run feature experiments',                  paid: true },
      { id: 'feature-gating', label: 'Feature Gating',   description: 'Show or hide features by user plan/role',  paid: true },
    ],
  },
]

// ---------------------------------------------------------------------------
// Component (read only)
// ---------------------------------------------------------------------------

export default function FeatureFlagsPage() {
  const t = useTranslations('featureFlagsPage')

  // Falls back to English if the "comingSoon" key has not been added to the
  // translation files yet, so this never throws a missing-message error.
  const comingSoon = t.has('comingSoon') ? t('comingSoon') : 'Coming soon'

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h2 className="text-base font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-xs text-gray-400 mt-1">{t('subheading')}</p>
      </div>

      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
        {comingSoon}
      </div>

      {FLAG_GROUPS.map((group) => (
        <div
          key={group.group}
          className="bg-white border border-gray-200 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {group.group}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {group.flags.map((flag) => (
              <div key={flag.id} className="flex items-center gap-4 px-5 py-3.5">

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{flag.label}</p>

                    <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-500 text-[9px] font-bold rounded uppercase">
                      {comingSoon}
                    </span>

                    {flag.paid && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-bold rounded uppercase">
                        <FiLock size={8} /> {t('paidBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{flag.description}</p>
                </div>

                {flag.type === 'select' && flag.options ? (
                  <select
                    disabled
                    value={flag.options[0].value}
                    onChange={() => {}}
                    aria-label={flag.label}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 opacity-50 cursor-not-allowed"
                  >
                    {flag.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <div
                    role="switch"
                    aria-checked={false}
                    aria-disabled="true"
                    aria-label={flag.label}
                    className="relative w-10 h-5 rounded-full bg-gray-200 opacity-50 cursor-not-allowed shrink-0"
                  >
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  )
}