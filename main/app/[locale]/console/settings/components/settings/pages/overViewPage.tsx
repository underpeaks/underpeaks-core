'use client'

import { useState, useEffect }                    from 'react'
import { SectionCard, Input, SaveButton, FormField } from '../../ui'
import { useConsoleStore }                        from '@/app/store/consoleStore'
import { useTranslations } from 'next-intl'

export default function OverviewPage() {
  const t = useTranslations('overviewPage')
  const { config, user, loadConfig } = useConsoleStore()

  const [projectName,   setProjectName]   = useState('')
  const [projectUrl,    setProjectUrl]    = useState('')
  const [nxfApiKey,     setNxfApiKey]     = useState('')
  const [apiKeySaved,   setApiKeySaved]   = useState(false)
  const [apiKeySaving,  setApiKeySaving]  = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)

  useEffect(() => {
    if (config) {
      setProjectName(config.project_name ?? '')
      setProjectUrl(config.project_url   ?? process.env.NEXT_PUBLIC_APP_DOMAIN ?? '')
      setNxfApiKey(config.nxf_api_key    ?? '')
    }
  }, [config])

  const capitalize = (s?: string) =>
    s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'

  const dbType = process.env.NEXT_PUBLIC_DB_TYPE ?? config?.db_type
  const env = process.env.NODE_ENV ?? config?.environment

  const stats = [
    { label: t('stats.dbType'),      value: capitalize(dbType)                  },
    { label: t('stats.environment'), value: capitalize(env)                     },
    { label: t('stats.deployment'),  value: capitalize(config?.deployment_type) },
    { label: t('stats.status'),      value: t('stats.statusActive')             },
  ]

  const userInfo = [
    { label: t('userInfo.fullName'),    value: user?.full_name  ?? '—' },
    { label: t('userInfo.email'),       value: user?.user_email ?? '—' },
    { label: t('userInfo.role'),        value: user?.role       ?? '—' },
    { label: t('userInfo.status'),      value: user?.status     ?? '—' },
    {
      label: t('userInfo.verified'),
      value: user?.email_verified ? t('userInfo.verifiedYes') : t('userInfo.verifiedNo'),
    },
    {
      label: t('userInfo.memberSince'),
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : '—',
    },
  ]

  const handleSaveApiKey = async () => {
    if (!nxfApiKey.trim()) return

    setApiKeySaving(true)
    setApiKeySaved(false)

    try {
      const res = await fetch('/api/update-project-settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:      user?.user_id,
          project_name: projectName || config?.project_name || '',
          project_url:  projectUrl  || config?.project_url  || '',
          nxf_api_key:  nxfApiKey,
        }),
      })

      if (res.ok) {
        loadConfig({ ...(config ?? {}), nxf_api_key: nxfApiKey })
        setApiKeySaved(true)
        setTimeout(() => setApiKeySaved(false), 3000)
      }
    } finally {
      setApiKeySaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/update-project-settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:      user?.user_id,
          project_name: projectName,
          project_url:  projectUrl,
        }),
      })

      if (res.ok) {
        loadConfig({
          ...(config ?? {}),
          project_name: projectName,
          project_url:  projectUrl,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('subheading')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-5 py-4">
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard title={t('licenseKey.sectionTitle')}>
        <p className="text-xs text-gray-400 mb-3">
          {t('licenseKey.description')}
        </p>

        <FormField label={t('licenseKey.inputLabel')}>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                value={nxfApiKey}
                onChange={setNxfApiKey}
                placeholder={t('licenseKey.inputPlaceholder')}
              />
            </div>

            <button
              onClick={handleSaveApiKey}
              disabled={apiKeySaving || !nxfApiKey.trim()}
              className="shrink-0 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {apiKeySaving
                ? t('licenseKey.buttonSaving')
                : apiKeySaved
                  ? t('licenseKey.buttonSaved')
                  : nxfApiKey && config?.nxf_api_key
                    ? t('licenseKey.buttonUpdate')
                    : t('licenseKey.buttonSave')
              }
            </button>
          </div>
        </FormField>

        {config?.nxf_api_key && (
          <p className="text-[11px] text-gray-400 mt-1">
           License key on file: {config.nxf_api_key.slice(0, 12)}...
          </p>
        )}
      </SectionCard>

      <SectionCard title={t('projectInfo.sectionTitle')}>
        <FormField label={t('projectInfo.nameLabel')}>
          <Input
            value={projectName}
            onChange={setProjectName}
            placeholder={t('projectInfo.namePlaceholder')}
          />
        </FormField>

        <FormField
          label={t('projectInfo.urlLabel')}
          hint={t('projectInfo.urlHint')}
        >
          <Input
            value={projectUrl}
            onChange={setProjectUrl}
            placeholder={t('projectInfo.urlPlaceholder')}
          />
        </FormField>
      </SectionCard>

      <SaveButton onClick={handleSave} saving={saving} saved={saved} />

    </div>
  )
}