/**
 * SmtpPage Component
 *
 * This is the SMTP Settings page inside the CMS Settings area.
 * It allows the user to configure outbound email for their project —
 * this covers things like email verification on sign-up and
 * forgot-password emails.
 *
 * What this page does:
 * - Detects whether the project uses a database type (e.g. Firebase or
 *   Supabase) that handles email natively. If so, it hides the email
 *   feature toggles and shows an informational notice instead.
 * - Shows toggles to enable/disable email verification and forgot-password
 *   emails (only for non-built-in-email database types).
 * - Shows a toggle to enable a custom SMTP server.
 * - When SMTP fields are needed (custom SMTP enabled, or email features
 *   are on without a built-in provider), reveals a full SMTP config form:
 *     host, port, from address, username, password (with show/hide toggle),
 *     and encryption type (TLS / SSL / None).
 * - On save, POSTs all settings to the server and updates the global config.
 *
 * Note on password field:
 * - The password is intentionally NOT pre-filled from config for security.
 *   If the user leaves it blank on save, `undefined` is sent so the server
 *   keeps the existing password unchanged.
 */

'use client'

import { useState, useEffect }                      from 'react'
//import { useTranslations }                          from 'next-intl'
import { SectionCard, FormField, Input, SaveButton } from '../../ui'
import { CMSToggle }                                from '../../ui/CMSToggle'
import { useConsoleStore }                          from '@/app/store/consoleStore'
import { FiEye, FiEyeOff }                         from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SmtpPage
 *
 * The main exported page component for the SMTP settings section.
 *
 * State managed here:
 * - `verifyEmail`    — Toggle: whether email verification on sign-up is enabled.
 * - `forgotPassword` — Toggle: whether forgot-password emails are enabled.
 * - `smtpEnabled`    — Toggle: whether a custom SMTP server is in use.
 * - `host`           — The SMTP server hostname (e.g. "smtp.example.com").
 * - `port`           — The SMTP port number (default: "587").
 * - `fromAddress`    — The "from" email address for outbound emails.
 * - `username`       — The SMTP authentication username.
 * - `password`       — The SMTP authentication password (never pre-filled).
 * - `showPassword`   — Whether to reveal the password field as plain text.
 * - `encryption`     — The encryption method: "TLS", "SSL", or "None".
 * - `saving`         — Whether the save request is in progress.
 * - `saved`          — Whether the last save was successful.
 */
export default function SmtpPage() {
  /**
   * t — Translation function scoped to the 'smtpPage' namespace.
   * Use t('key') to get the translated string for that key.
   */
  //const t = useTranslations('smtpPage')

  /**
   * Pull global state from the console store:
   * - `config`     — Full CMS config (includes smtp sub-object).
   * - `user`       — Logged-in user (needed for the save API call).
   * - `loadConfig` — Updates the global config after a successful save.
   */
  const { config, user, loadConfig } = useConsoleStore()

  /**
   * dbType — The database/backend type in use (e.g. "firebase", "supabase").
   * Currently hardcoded to '' (empty string) while the env/config detection
   * is commented out. This means `usesBuiltInEmail` will always be false
   * until that line is restored.
   */
  const dbType = '' // (process.env.NEXT_PUBLIC_DB_TYPE ?? config?.db_type ?? '').toLowerCase()

  /**
   * usesBuiltInEmail
   *
   * True if the project uses Firebase or Supabase, which handle email
   * verification and password reset natively — meaning we do NOT need
   * to configure SMTP for those features.
   *
   * When true:
   * - The email feature toggles are hidden.
   * - An informational notice is shown instead.
   */
  const usesBuiltInEmail = ['firebase', 'supabase'].includes(dbType)

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Whether email verification on sign-up is enabled. */
  const [verifyEmail,    setVerifyEmail]    = useState(false)

  /** Whether forgot-password emails are enabled. */
  const [forgotPassword, setForgotPassword] = useState(false)

  /** Whether a custom SMTP server is enabled. */
  const [smtpEnabled,    setSmtpEnabled]    = useState(false)

  /** SMTP server hostname. */
  const [host,           setHost]           = useState('')

  /** SMTP port number. Defaults to 587 (standard TLS port). */
  const [port,           setPort]           = useState('587')

  /** The "from" address that outbound emails will be sent from. */
  const [fromAddress,    setFromAddress]    = useState('')

  /** SMTP authentication username. */
  const [username,       setUsername]       = useState('')

  /**
   * SMTP authentication password.
   * Intentionally NOT pre-filled from config for security.
   * If left blank on save, the server keeps the existing password.
   */
  const [password,       setPassword]       = useState('')

  /** Whether the password input is shown as plain text or masked. */
  const [showPassword,   setShowPassword]   = useState(false)

  /**
   * Encryption type for the SMTP connection.
   * Options: 'TLS' (default), 'SSL', or 'None'.
   */
  const [encryption,     setEncryption]     = useState<'TLS' | 'SSL' | 'None'>('TLS')

  /** Whether the save request is currently in progress. */
  const [saving,         setSaving]         = useState(false)

  /**
   * Whether the last save was successful.
   * Set to true after a successful save, auto-resets after 3 seconds.
   */
  const [saved,          setSaved]          = useState(false)

  // -------------------------------------------------------------------------
  // Sync state from config on load
  // -------------------------------------------------------------------------

  /**
   * useEffect — Pre-fill all SMTP form fields from the global config.
   *
   * Runs whenever `config` changes. If no smtp config exists yet,
   * it exits early and leaves all fields at their default values.
   * Note: password is intentionally excluded for security.
   */
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

  // -------------------------------------------------------------------------
  // Derived: should the SMTP fields be visible?
  // -------------------------------------------------------------------------

  /**
   * showSmtpFields
   *
   * Controls whether the "SMTP Configuration" section card is visible.
   *
   * It is shown when EITHER:
   * - The user has explicitly enabled the custom SMTP toggle, OR
   * - The database type does NOT have built-in email AND the user has
   *   enabled at least one email feature (verify email or forgot password).
   *
   * This ensures the SMTP fields only appear when they are actually needed.
   */
  const showSmtpFields =
    smtpEnabled || (!usesBuiltInEmail && (verifyEmail || forgotPassword))

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  /**
   * handleSave
   *
   * Saves all SMTP settings to the server.
   *
   * Steps:
   * 1. POSTs all current SMTP state to `/api/update-smtp-settings`.
   * 2. Password is sent as `undefined` if left blank so the server
   *    knows to keep the existing password rather than overwriting it.
   * 3. On success:
   *    - Updates the global config store with the new SMTP values
   *      (password excluded from config store for security).
   *    - Shows the saved confirmation for 3 seconds.
   */
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    console.log(('logs.savingSmtp'))

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
          // Only send password if the user typed one — otherwise keep existing
          password:        password || undefined,
          encryption,
        }),
      })

      if (res.ok) {
        /**
         * Update the global config with the new SMTP settings.
         * Password is intentionally excluded here — we never store
         * the raw password in the client-side config object.
         */
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
        console.log(('logs.smtpSaved'))
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5">

      {/* ------------------------------------------------------------------
        * Page heading and description
        * ------------------------------------------------------------------ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">{('heading')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{('subheading')}</p>
      </div>

      {/* ------------------------------------------------------------------
        * Email Features Section
        * Shows toggles for email verification and forgot-password emails.
        * If the DB type handles email natively, toggles are hidden and
        * an informational notice is shown instead.
        * ------------------------------------------------------------------ */}
      <SectionCard title={('emailFeatures.sectionTitle')}>

        {/* Email feature toggles — only shown for non-built-in providers */}
        {!usesBuiltInEmail && (
          <>
            <CMSToggle
              checked={verifyEmail}
              onChange={setVerifyEmail}
              label={('emailFeatures.verifyEmailLabel')}
            />
            <CMSToggle
              checked={forgotPassword}
              onChange={setForgotPassword}
              label={('emailFeatures.forgotPasswordLabel')}
            />
          </>
        )}

        {/*
         * Built-in email notice — only shown for Firebase / Supabase.
         * Capitalises the first letter of the db type for the display name.
         */}
        {usesBuiltInEmail && (
          <p className="text-xs text-blue-500 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mb-3">
            Built-in email features are enabled for {dbType.charAt(0).toUpperCase() + dbType.slice(1)}.
          </p>
        )}

        {/* Custom SMTP toggle — always visible */}
        <CMSToggle
          checked={smtpEnabled}
          onChange={setSmtpEnabled}
          label={('emailFeatures.smtpToggleLabel')}
        />
      </SectionCard>

      {/* ------------------------------------------------------------------
        * SMTP Configuration Section
        * Only rendered when `showSmtpFields` is true.
        * Contains all the fields needed to connect to a custom SMTP server.
        * ------------------------------------------------------------------ */}
      {showSmtpFields && (
        <SectionCard title={('smtpConfig.sectionTitle')}>

          {/* Host and Port — side by side in a 2-column grid */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label={('smtpConfig.hostLabel')}>
              <Input
                value={host}
                onChange={setHost}
                placeholder={('smtpConfig.hostPlaceholder')}
              />
            </FormField>
            <FormField label={('smtpConfig.portLabel')}>
              <Input
                value={port}
                onChange={setPort}
                placeholder={('smtpConfig.portPlaceholder')}
              />
            </FormField>
          </div>

          {/* From Address */}
          <FormField label={('smtpConfig.fromAddressLabel')}>
            <Input
              value={fromAddress}
              onChange={setFromAddress}
              placeholder={('smtpConfig.fromAddressPlaceholder')}
            />
          </FormField>

          {/* Username */}
          <FormField label={('smtpConfig.usernameLabel')}>
            <Input
              value={username}
              onChange={setUsername}
              placeholder={('smtpConfig.usernamePlaceholder')}
            />
          </FormField>

          {/* Password with show/hide toggle button */}
          <FormField label={('smtpConfig.passwordLabel')}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  value={password}
                  onChange={setPassword}
                  placeholder={
                    config?.smtp?.username
                      ? '••••••••••••'
                      : ('smtpConfig.passwordPlaceholder')
                  }
                  type={showPassword ? 'text' : 'password'}
                />
              </div>

              {/*
               * Show/hide password toggle button.
               * Toggles `showPassword` state which switches the input
               * between type="password" (masked) and type="text" (visible).
               */}
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition"
                title={showPassword ? ('smtpConfig.hidePassword') : ('smtpConfig.showPassword')}
              >
                {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </FormField>

          {/* Encryption type — dropdown with TLS, SSL, None options */}
          <FormField label={('smtpConfig.encryptionLabel')}>
            <select
              value={encryption}
              onChange={(e) => setEncryption(e.target.value as 'TLS' | 'SSL' | 'None')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              <option value="TLS">TLS</option>
              <option value="SSL">SSL</option>
              <option value="None">{('smtpConfig.encryptionNone')}</option>
            </select>
          </FormField>

        </SectionCard>
      )}

      {/* Save button — provided by the shared SaveButton component */}
      <SaveButton onClick={handleSave} saving={saving} saved={saved} />

    </div>
  )
}