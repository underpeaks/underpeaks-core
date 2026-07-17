/**
 * AccountPage.tsx
 * ----------------
 * The user account management page, accessible from the user dropdown in the console.
 * Located at: /console/account
 *
 * What does this page let the user do?
 * --------------------------------------
 * It is split into three sections:
 *
 *  1. Profile — Update their display name.
 *     The avatar is generated automatically from their initials (no image upload yet).
 *     The email address is read-only as it is managed by the auth provider.
 *
 *  2. Change Password — Update their password by providing their current password,
 *     a new password (minimum 8 characters), and a confirmation.
 *     Inline validation messages appear as the user types.
 *
 *  3. Billing & Plan — Shows the user's current deployment type (e.g. Self-hosted, Pro).
 *     Self-hosted users see an upgrade prompt and a list of Pro features.
 *     Pro/Enterprise users see a simple "all features unlocked" message.
 *
 * How is layout structured?
 * --------------------------
 * The page uses two small sub-components defined in this file:
 *  - AccountSection — a white card with a title, optional description, and content area
 *  - AccountField   — a labelled input wrapper for consistent form field layout
 *
 * ⚠️  Security rules for this component:
 *   - Never log the auth token read from localStorage
 *   - Never log currentPassword, newPassword, or confirmPassword
 *   - Never log raw API error responses beyond what is shown to the user
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  FiUser, FiLock, FiCreditCard, FiArrowUpRight,
  FiCheck, FiEye, FiEyeOff,
} from 'react-icons/fi'
import { useConsoleStore } from '@/app/store/consoleStore'

// ─────────────────────────────────────────────────────────────────
// SHARED STYLE CONSTANTS
// ─────────────────────────────────────────────────────────────────

/**
 * inputClass
 * -----------
 * Tailwind classes for a standard editable text input.
 * Used across all editable fields on this page for visual consistency.
 */
const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition'

/**
 * disabledClass
 * --------------
 * Tailwind classes for a read-only/disabled input.
 * Used for fields the user cannot edit (e.g. email address).
 * The grayed-out appearance signals to the user that this field is locked.
 */
const disabledClass = 'w-full px-3 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed'

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * getAvatarColor
 * ---------------
 * Returns a deterministic Tailwind background colour class for the initials avatar.
 * "Deterministic" means the same initials always produce the same colour —
 * so the avatar colour stays consistent across page loads and re-renders.
 *
 * How it works:
 * We add the character codes of the first and second initials and use the remainder
 * (modulo) when dividing by the number of colours to pick a consistent index.
 *
 * TODO: This function is duplicated from UserDropdown.tsx. Extract it to a shared
 * utility file (e.g. /utils/avatarUtils.ts) and import it in both places
 * to avoid maintaining two copies.
 *
 * @param initials - 1–2 uppercase characters (e.g. 'JS', 'MA')
 * @returns          A Tailwind CSS background colour class (e.g. 'bg-violet-500')
 */
function getAvatarColor(initials: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500',  'bg-cyan-500', 'bg-pink-500',    'bg-indigo-500',
  ]
  return colors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length]
}

/**
 * formatDeploymentType
 * ----------------------
 * Formats a raw deployment_type string from the config into a human-readable label.
 * Splits on underscores, capitalises each word, and joins with hyphens.
 *
 * TODO: This function is also duplicated from UserDropdown.tsx. Extract to a shared
 * utility file alongside getAvatarColor.
 *
 * @param type - Raw deployment type string (e.g. 'self_hosted', 'cloud_pro')
 * @returns      Formatted label (e.g. 'Self-Hosted', 'Cloud-Pro'),
 *               or 'Self-hosted' as the default fallback
 *
 * Examples:
 *   formatDeploymentType('self_hosted') → 'Self-Hosted'
 *   formatDeploymentType('cloud_pro')   → 'Cloud-Pro'
 *   formatDeploymentType(undefined)     → 'Self-hosted'
 */
function formatDeploymentType(type?: string): string {
  if (!type) return 'Self-hosted'
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-')
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

/**
 * AccountSection
 * ---------------
 * A reusable white card wrapper used to group related settings on this page.
 * Each section has a header area (with title and optional description) and a content area.
 *
 * @param title       - The section heading (e.g. 'Profile', 'Change Password')
 * @param description - An optional subtitle shown below the heading in smaller grey text
 * @param children    - The content to render inside the section card
 */
function AccountSection({ title, description, children }: {
  title:        string
  description?: string
  children:     React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

/**
 * AccountField
 * -------------
 * A reusable wrapper for a single labelled form field.
 * Ensures consistent spacing and label styling across all fields on the page.
 *
 * @param label    - The field label text shown above the input
 * @param children - The input element(s) to render below the label
 */
function AccountField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * AccountPage
 * ------------
 * The main account management page component.
 * Reads user and config data from the global console store.
 * Manages its own local form state for profile and password changes.
 */
export default function AccountPage() {
  // Read user and config from the global console store.
  // setConsoleValue is used to update the store after a successful profile save,
  // so the TopNavbar and UserDropdown reflect the new name immediately.
  const { user, config, setConsoleValue } = useConsoleStore()

  // Access translated strings for this page
  const t = useTranslations('accountPage')

  // ── Profile form state ──
  // Initialised from the store so the input shows the current name on load
  const [fullName,      setFullName]      = useState(user?.full_name ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved,  setProfileSaved]  = useState(false)  // Shows a brief "Saved" confirmation
  const [profileError,  setProfileError]  = useState<string | null>(null)

  // ── Password form state ──
  // ⚠️ These values must never be logged under any circumstances
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Controls whether each password field shows plain text or bullets
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved,  setPasswordSaved]  = useState(false)  // Shows a brief "Updated" confirmation
  const [passwordError,  setPasswordError]  = useState<string | null>(null)

  // ── Avatar ──
  // Derived from the fullName — takes up to 2 initials from the name words.
  // Falls back to 'U' if no name is set.
  const initials   = fullName.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const colorClass = getAvatarColor(initials)

  // ── Deployment / billing ──
  const deploymentType = config?.deployment_type
  const isSelfHosted   = !deploymentType || deploymentType === 'self_hosted'
  const planLabel      = formatDeploymentType(deploymentType)

  // ── Password validation ──
  // All four conditions must be true before the "Update password" button is enabled:
  //  1. currentPassword is not empty
  //  2. newPassword is not empty
  //  3. confirmPassword is not empty
  //  4. newPassword and confirmPassword match
  //  5. newPassword is at least 8 characters long
  //
  // NOTE: passwordValid is declared here (before savePassword) so both savePassword
  // and the button's disabled prop can reference it without confusion.
  const passwordValid =
    currentPassword &&
    newPassword &&
    confirmPassword &&
    newPassword === confirmPassword &&
    newPassword.length >= 8

  /**
   * saveProfile
   * ------------
   * Sends the updated full name to the API and updates the console store on success.
   *
   * Why update the store?
   * ----------------------
   * The user's display name is shown in multiple places (TopNavbar, UserDropdown, this page).
   * By calling setConsoleValue after a successful save, all those components update
   * immediately without requiring a page reload.
   *
   * ⚠️ The auth token is never logged.
   */
  const saveProfile = async () => {
    // Guard: do nothing if the name field is empty or whitespace only
    if (!fullName.trim()) return

    setProfileSaving(true)
    setProfileError(null)

    try {
      // ⚠️ Token read from localStorage — never log this value
      const token = localStorage.getItem('authToken') ?? ''

      const res = await fetch('/api/update-profile', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('errors.profileUpdateFailed'))

      // Update the global store so all components using the user's name refresh instantly
      if (user) {
        setConsoleValue('user', { ...user, full_name: fullName })
      }

      // Show a brief "Saved" confirmation on the button, then reset after 2.5 seconds
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)

    } catch (err: any) {
      // Show the error message returned by the API, or a generic fallback
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  /**
   * savePassword
   * -------------
   * Sends the current and new passwords to the API to update the user's password.
   * Clears all password fields on success.
   *
   * ⚠️ currentPassword and newPassword are never logged — they are security credentials.
   */
  const savePassword = async () => {
    // Guard: only proceed if all validation conditions are met
    if (!passwordValid) return

    setPasswordSaving(true)
    setPasswordError(null)

    try {
      // ⚠️ Token read from localStorage — never log this value
      const token = localStorage.getItem('authToken') ?? ''

      const res = await fetch('/api/change-password', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // ⚠️ Passwords are sent to our own API over HTTPS — never log these values
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('errors.passwordUpdateFailed'))

      // Clear all password fields after a successful update
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Show a brief "Updated" confirmation on the button, then reset after 2.5 seconds
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 2500)

    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Page Title ── */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t('subtitle')}</p>
        </div>

        {/* ── Section 1: Profile ── */}
        <AccountSection
          title={t('profile.title')}
          description={t('profile.description')}
        >
          <div className="flex flex-col gap-5">

            {/* Avatar preview + current name and email */}
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full ${colorClass} flex items-center justify-center text-white text-lg font-bold shrink-0`}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {fullName || user?.full_name}
                </p>
                <p className="text-xs text-gray-400">{user?.user_email}</p>
              </div>
            </div>

            {/* Profile form fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Full name — editable */}
              <AccountField label={t('profile.fullNameLabel')}>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  placeholder={t('profile.fullNamePlaceholder')}
                  aria-label={t('profile.fullNameLabel')}
                />
              </AccountField>

              {/* Email address — read-only, managed by auth provider */}
              <AccountField label={t('profile.emailLabel')}>
                <input
                  value={user?.user_email ?? ''}
                  readOnly
                  disabled
                  className={disabledClass}
                  aria-label={t('profile.emailLabel')}
                  aria-describedby="email-readonly-note"
                />
                <p id="email-readonly-note" className="text-[10px] text-gray-400">
                  {t('profile.emailReadOnlyNote')}
                </p>
              </AccountField>

            </div>

            {/* Profile save error */}
            {profileError && (
              <p className="text-xs text-red-500" role="alert">{profileError}</p>
            )}

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={saveProfile}
                disabled={profileSaving || !fullName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-busy={profileSaving}
              >
                {profileSaved ? (
                  <><FiCheck size={13} aria-hidden="true" /> {t('profile.savedButton')}</>
                ) : profileSaving ? (
                  t('profile.savingButton')
                ) : (
                  t('profile.saveButton')
                )}
              </button>
            </div>

          </div>
        </AccountSection>

        {/* ── Section 2: Change Password ── */}
        <AccountSection
          title={t('password.title')}
          description={t('password.description')}
        >
          <div className="flex flex-col gap-4">

            {/* Current password field with show/hide toggle */}
            <AccountField label={t('password.currentLabel')}>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass + ' pr-10'}
                  placeholder="••••••••"
                  aria-label={t('password.currentLabel')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showCurrent ? t('password.hidePassword') : t('password.showPassword')}
                >
                  {showCurrent
                    ? <FiEyeOff size={15} aria-hidden="true" />
                    : <FiEye size={15} aria-hidden="true" />
                  }
                </button>
              </div>
            </AccountField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* New password field */}
              <AccountField label={t('password.newLabel')}>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass + ' pr-10'}
                    placeholder="••••••••"
                    aria-label={t('password.newLabel')}
                    aria-describedby="new-password-hint"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showNew ? t('password.hidePassword') : t('password.showPassword')}
                  >
                    {showNew
                      ? <FiEyeOff size={15} aria-hidden="true" />
                      : <FiEye size={15} aria-hidden="true" />
                    }
                  </button>
                </div>
                {/* Inline minimum length warning — shown as the user types */}
                {newPassword && newPassword.length < 8 && (
                  <p id="new-password-hint" className="text-[11px] text-red-500 mt-0.5" role="alert">
                    {t('password.minLengthHint')}
                  </p>
                )}
              </AccountField>

              {/* Confirm new password field */}
              <AccountField label={t('password.confirmLabel')}>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-10 ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-red-300 focus:ring-red-200'
                        : ''
                    }`}
                    placeholder="••••••••"
                    aria-label={t('password.confirmLabel')}
                    aria-describedby="confirm-password-hint"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirm ? t('password.hidePassword') : t('password.showPassword')}
                  >
                    {showConfirm
                      ? <FiEyeOff size={15} aria-hidden="true" />
                      : <FiEye size={15} aria-hidden="true" />
                    }
                  </button>
                </div>
                {/* Inline mismatch warning — shown only when both fields have content */}
                {confirmPassword && newPassword !== confirmPassword && (
                  <p id="confirm-password-hint" className="text-[11px] text-red-500 mt-0.5" role="alert">
                    {t('password.mismatchHint')}
                  </p>
                )}
              </AccountField>

            </div>

            {/* Password save error */}
            {passwordError && (
              <p className="text-xs text-red-500" role="alert">{passwordError}</p>
            )}

            {/* Update password button */}
            <div className="flex justify-end">
              <button
                onClick={savePassword}
                disabled={!passwordValid || passwordSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-busy={passwordSaving}
              >
                {passwordSaved ? (
                  <><FiCheck size={13} aria-hidden="true" /> {t('password.updatedButton')}</>
                ) : passwordSaving ? (
                  t('password.updatingButton')
                ) : (
                  t('password.updateButton')
                )}
              </button>
            </div>

          </div>
        </AccountSection>

        {/* ── Section 3: Billing & Plan ── */}
        <AccountSection
          title={t('billing.title')}
          description={t('billing.description')}
        >
          <div className="flex items-center justify-between gap-4">

            {/* Plan info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FiCreditCard size={18} className="text-gray-500" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{planLabel}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isSelfHosted
                    ? t('billing.selfHostedDescription')
                    : t('billing.paidDescription')
                  }
                </p>
              </div>
            </div>

            {/* Upgrade button — only shown for self-hosted users */}
            {isSelfHosted && (
              <a
                href="https://console.underpeaks.com/upgrade"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition shrink-0"
                aria-label={t('billing.upgradeAriaLabel')}
              >
                {t('billing.upgradeButton')}
                <FiArrowUpRight size={13} aria-hidden="true" />
              </a>
            )}

          </div>

          {/* Pro features list — only shown for self-hosted users */}
          {isSelfHosted && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">{t('billing.proFeaturesTitle')}</p>
              <ul className="mt-1.5 text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                <li>{t('billing.proFeature1')}</li>
                <li>{t('billing.proFeature2')}</li>
                <li>{t('billing.proFeature3')}</li>
                <li>{t('billing.proFeature4')}</li>
              </ul>
            </div>
          )}

        </AccountSection>

      </div>
    </div>
  )
}