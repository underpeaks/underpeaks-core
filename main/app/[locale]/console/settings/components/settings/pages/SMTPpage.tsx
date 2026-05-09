'use client'

import { useState, useEffect } from 'react'
import { SectionCard, FormField, Input, SaveButton } from '../../ui'
import { CMSToggle } from '../../ui/CMSToggle'
import { useConsoleStore } from '@/app/store/consoleStore'
import { FiEye, FiEyeOff } from 'react-icons/fi'

export default function SmtpPage() {
  const { config, user, loadConfig } = useConsoleStore()

  const dbType           = ''//(process.env.NEXT_PUBLIC_DB_TYPE ?? config?.db_type ?? '').toLowerCase()
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

  const showSmtpFields = smtpEnabled || (!usesBuiltInEmail && (verifyEmail || forgotPassword))

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/update-smtp-settings', {
        method: 'POST',
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
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      <div>
        <h2 className="text-lg font-bold text-gray-900">SMTP Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure outbound email for your project.
        </p>
      </div>

      <SectionCard title="Email Features">
        {!usesBuiltInEmail && (
          <>
            <CMSToggle checked={verifyEmail}    onChange={setVerifyEmail}    label="Enable email verification on sign-up" />
            <CMSToggle checked={forgotPassword} onChange={setForgotPassword} label="Enable forgot password emails" />
          </>
        )}

        {usesBuiltInEmail && (
          <p className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mb-3">
            {dbType.charAt(0).toUpperCase() + dbType.slice(1)} handles email verification
            and password reset natively — no SMTP needed for those features.
          </p>
        )}

        <CMSToggle checked={smtpEnabled} onChange={setSmtpEnabled} label="Use custom SMTP server" />
      </SectionCard>

      {showSmtpFields && (
        <SectionCard title="SMTP Configuration">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="SMTP Host">
              <Input value={host} onChange={setHost} placeholder="smtp.example.com" />
            </FormField>
            <FormField label="Port">
              <Input value={port} onChange={setPort} placeholder="587" />
            </FormField>
          </div>
          <FormField label="From Address">
            <Input value={fromAddress} onChange={setFromAddress} placeholder="no-reply@example.com" />
          </FormField>
          <FormField label="Username">
            <Input value={username} onChange={setUsername} placeholder="SMTP username" />
          </FormField>

          {/* Password with show/hide toggle */}
          <FormField label="Password">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={password}
                  onChange={setPassword}
                  placeholder={config?.smtp?.username ? '••••••••••••' : 'SMTP password'}
                  type={showPassword ? 'text' : 'password'}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </FormField>

          <FormField label="Encryption">
            <select
              value={encryption}
              onChange={(e) => setEncryption(e.target.value as 'TLS' | 'SSL' | 'None')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              <option>TLS</option>
              <option>SSL</option>
              <option>None</option>
            </select>
          </FormField>
        </SectionCard>
      )}

      <SaveButton onClick={handleSave} saving={saving} saved={saved} />

    </div>
  )
}