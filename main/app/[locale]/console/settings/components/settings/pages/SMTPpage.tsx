'use client'

import { useState, useEffect }                      from 'react'
import { SectionCard, FormField, Input, SaveButton } from '../../ui'
import { CMSToggle }                                from '../../ui/CMSToggle'
import { useConsoleStore }                          from '@/app/store/consoleStore'
import { FiEye, FiEyeOff }                         from 'react-icons/fi'
import { useTranslations } from 'next-intl'

export default function SmtpPage() {
  const t = useTranslations('smtpPage')

  const { config, user, loadConfig } = useConsoleStore()

  const dbType = '' // (process.env.NEXT_PUBLIC_DB_TYPE ?? config?.db_type ?? '').toLowerCase()

  const usesBuiltInEmail = ['firebase', 'supabase'].includes(dbType)

  const [verifyEmail,    setVerifyEmail]    = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)
  const [smtpEnabled,    setSmtpEnabled]    = useState(false)
  const [host,           setHost]           = useState('')
  const [port,           setPort]           = useState('587')
  const [fromAddress,    setFromAddress]    = useState('')
  const [username,       setUsername]       = useState('')
  const [password,       setPassword]       = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const [encryption,     setEncryption]     = useState<'TLS' | 'SSL' | 'None'>('TLS')
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)

  useEffect(() => {
    const smtp = config?.smtp
    if (!smtp) return

    setVerifyEmail(smtp.verify_email       ?? false)
    setForgotPassword(smtp.forgot_password ?? false)
    setSmtpEnabled(smtp.enabled            ?? false)
    setHost(smtp.host                      ?? '')
    setPort(smtp.port                      ?? '587')
    setFromAddress(smtp.from_address       ?? '')
    setUsername(smtp.username              ?? '')
    setEncryption(smtp.encryption          ?? 'TLS')
  }, [config])

  const showSmtpFields =
    smtpEnabled || (!usesBuiltInEmail && (verifyEmail || forgotPassword))

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    console.log(t('logs.savingSmtp'))

    try {
      const res = await fetch('/api/update-smtp-settings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:         user?.user_id,
          verify_email:    verifyEmail,
          forgot_password: forgotPassword,
          smtp_enabled:    smtpEnabled,
          host,
          port,
          from_address:    fromAddress,
          username,
          password:        password || undefined,
          encryption,
        }),
      })

      if (res.ok) {
        loadConfig({
          ...(config ?? {}),
          smtp: {
            enabled:         smtpEnabled,
            verify_email:    verifyEmail,
            forgot_password: forgotPassword,
            host,
            port,
            from_address:    fromAddress,
            username,
            encryption,
          },
        })

        setSaved(true)
        console.log(t('logs.smtpSaved'))
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

      <SectionCard title={t('emailFeatures.sectionTitle')}>

        {!usesBuiltInEmail && (
          <>
            <CMSToggle
              checked={verifyEmail}
              onChange={setVerifyEmail}
              label={t('emailFeatures.verifyEmailLabel')}
            />
            <CMSToggle
              checked={forgotPassword}
              onChange={setForgotPassword}
              label={t('emailFeatures.forgotPasswordLabel')}
            />
          </>
        )}

        {usesBuiltInEmail && (
          <p className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mb-3">
            Built-in email features are enabled for {dbType.charAt(0).toUpperCase() + dbType.slice(1)}.
          </p>
        )}

        <CMSToggle
          checked={smtpEnabled}
          onChange={setSmtpEnabled}
          label={t('emailFeatures.smtpToggleLabel')}
        />
      </SectionCard>

      {showSmtpFields && (
        <SectionCard title={t('smtpConfig.sectionTitle')}>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('smtpConfig.hostLabel')}>
              <Input
                value={host}
                onChange={setHost}
                placeholder={t('smtpConfig.hostPlaceholder')}
              />
            </FormField>
            <FormField label={t('smtpConfig.portLabel')}>
              <Input
                value={port}
                onChange={setPort}
                placeholder={t('smtpConfig.portPlaceholder')}
              />
            </FormField>
          </div>

          <FormField label={t('smtpConfig.fromAddressLabel')}>
            <Input
              value={fromAddress}
              onChange={setFromAddress}
              placeholder={t('smtpConfig.fromAddressPlaceholder')}
            />
          </FormField>

          <FormField label={t('smtpConfig.usernameLabel')}>
            <Input
              value={username}
              onChange={setUsername}
              placeholder={t('smtpConfig.usernamePlaceholder')}
            />
          </FormField>

          <FormField label={t('smtpConfig.passwordLabel')}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={password}
                  onChange={setPassword}
                  placeholder={
                    config?.smtp?.username
                      ? '••••••••••••'
                      : t('smtpConfig.passwordPlaceholder')
                  }
                  type={showPassword ? 'text' : 'password'}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition"
                title={showPassword ? t('smtpConfig.hidePassword') : t('smtpConfig.showPassword')}
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </FormField>

          <FormField label={t('smtpConfig.encryptionLabel')}>
            <select
              value={encryption}
              onChange={(e) => setEncryption(e.target.value as 'TLS' | 'SSL' | 'None')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              <option value="TLS">TLS</option>
              <option value="SSL">SSL</option>
              <option value="None">{t('smtpConfig.encryptionNone')}</option>
            </select>
          </FormField>

        </SectionCard>
      )}

      <SaveButton onClick={handleSave} saving={saving} saved={saved} />

    </div>
  )
}