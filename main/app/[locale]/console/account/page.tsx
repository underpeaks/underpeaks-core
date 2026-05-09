'use client'

import { useState } from 'react'
import {
  FiUser, FiLock, FiCreditCard, FiArrowUpRight,
  FiCheck, FiEye, FiEyeOff,
} from 'react-icons/fi'
import { useConsoleStore } from '@/app/store/consoleStore'

function AccountSection({ title, description, children }: {
  title:        string
  description?: string
  children:     React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function AccountField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}

function formatDeploymentType(type?: string): string {
  if (!type) return 'Self-hosted'
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-')
}

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
const disabledClass = "w-full px-3 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"

function getAvatarColor(initials: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500',  'bg-cyan-500', 'bg-pink-500',    'bg-indigo-500',
  ]
  return colors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length]
}

export default function AccountPage() {
  const { user, config, setConsoleValue } = useConsoleStore()

  const [fullName,        setFullName]        = useState(user?.full_name ?? '')
  const [profileSaving,   setProfileSaving]   = useState(false)
  const [profileSaved,    setProfileSaved]    = useState(false)
  const [profileError,    setProfileError]    = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent,     setShowCurrent]     = useState(false)
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [passwordSaving,  setPasswordSaving]  = useState(false)
  const [passwordSaved,   setPasswordSaved]   = useState(false)
  const [passwordError,   setPasswordError]   = useState<string | null>(null)

  const initials = fullName.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const colorClass = getAvatarColor(initials)

  const deploymentType  = config?.deployment_type
  const isSelfHosted    = !deploymentType || deploymentType === 'self_hosted'

  const planLabel = formatDeploymentType(deploymentType)

  const saveProfile = async () => {
    if (!fullName.trim()) return
    setProfileSaving(true)
    setProfileError(null)
    try {
      const token = localStorage.getItem('authToken') ?? ''
      const res   = await fetch('/api/update-profile', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')

      // Update store so TopNavbar and dropdown reflect the change instantly
      if (user) {
        setConsoleValue('user', { ...user, full_name: fullName })
      }

      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err: any) {
      setProfileError(err.message)
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async () => {
    if (!passwordValid) return
    setPasswordSaving(true)
    setPasswordError(null)
    try {
      const token = localStorage.getItem('authToken') ?? ''
      const res   = await fetch('/api/change-password', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Password update failed')

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setTimeout(() => setPasswordSaved(false), 2500)
    } catch (err: any) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  const passwordValid = currentPassword && newPassword && confirmPassword && newPassword === confirmPassword && newPassword.length >= 8

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gray-100">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Account</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your profile and security.</p>
        </div>

        {/* ── Profile ── */}
        <AccountSection title="Profile" description="Update your display name.">
          <div className="flex flex-col gap-5">

            {/* Avatar — initials only, no upload */}
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${colorClass} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{fullName || user?.full_name}</p>
                <p className="text-xs text-gray-400">{user?.user_email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AccountField label="Full name">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                  placeholder="Your full name"
                />
              </AccountField>
              <AccountField label="Email address">
                <input
                  value={user?.user_email ?? ''}
                  readOnly
                  disabled
                  className={disabledClass}
                />
                <p className="text-[10px] text-gray-400">
                  Email is managed by your auth provider and cannot be changed here.
                </p>
              </AccountField>
            </div>

            {profileError && (
              <p className="text-xs text-red-500">{profileError}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={saveProfile}
                disabled={profileSaving || !fullName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {profileSaved
                  ? <><FiCheck size={13} /> Saved</>
                  : profileSaving ? 'Saving…' : 'Save changes'
                }
              </button>
            </div>
          </div>
        </AccountSection>

        {/* ── Password ── */}
        <AccountSection title="Change Password" description="Use a strong password you don't use elsewhere.">
          <div className="flex flex-col gap-4">

            <AccountField label="Current password">
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={inputClass + ' pr-10'}
                  placeholder="••••••••"
                />
                <button
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrent ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </AccountField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AccountField label="New password">
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass + ' pr-10'}
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {newPassword && newPassword.length < 8 && (
                  <p className="text-[11px] text-red-500 mt-0.5">Minimum 8 characters</p>
                )}
              </AccountField>

              <AccountField label="Confirm new password">
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputClass} pr-10 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-300 focus:ring-red-200' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-500 mt-0.5">Passwords do not match</p>
                )}
              </AccountField>
            </div>

            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={savePassword}
                disabled={!passwordValid || passwordSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {passwordSaved
                  ? <><FiCheck size={13} /> Updated</>
                  : passwordSaving ? 'Updating…' : 'Update password'
                }
              </button>
            </div>
          </div>
        </AccountSection>

        {/* ── Billing plan ── */}
        <AccountSection title="Billing & Plan" description="Your current plan and upgrade options.">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <FiCreditCard size={18} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{planLabel}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isSelfHosted
                    ? 'Core features included. Upgrade for integrations, advanced auth, and white-labelling.'
                    : 'All features unlocked.'
                  }
                </p>
              </div>
            </div>

            {isSelfHosted && (
              <a
  href="https://console.nxtflutter.com/upgrade"
  target="_blank"
  rel="noreferrer"
  className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition shrink-0"
>
  Upgrade <FiArrowUpRight size={13} />
</a>
            )}
          </div>

          {isSelfHosted && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">What you get on Pro</p>
              <ul className="mt-1.5 text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                <li>Integrations (Stripe, Mailchimp, and more)</li>
                <li>Advanced auth — 2FA, social login, magic link, SSO</li>
                <li>White-label the CMS with your own branding</li>
                <li>Custom domain for your console</li>
              </ul>
            </div>
          )}
        </AccountSection>

      </div>
    </div>
  )
}