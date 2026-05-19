/**
 * FeatureFlagsPage Component
 *
 * This is the Feature Flags page inside the CMS Theming section.
 * It allows the user to toggle which features will be included in their
 * generated Flutter and Next.js apps.
 *
 * What this page does:
 * - Displays feature flags grouped by category (e.g. Appearance, Localisation,
 *   App Behaviour, Authentication, Advanced).
 * - Free flags can be toggled on/off by the user.
 * - Paid flags are locked behind an upgrade prompt — their toggles are
 *   disabled and a lock icon is shown next to each one.
 * - Shows an upgrade prompt banner above the paid flag groups to inform
 *   the user they need a hosted plan to unlock those features.
 * - On "Save Flags", simulates a save (currently uses a timeout — no API
 *   call yet) and shows a brief "Saved" confirmation.
 *
 * Local sub-components defined in this file:
 * - Toggle        — A simple on/off toggle switch (supports disabled state).
 * - UpgradePrompt — Amber banner shown above paid feature groups.
 * - SectionCard   — Titled card wrapper (paid variant has amber styling).
 *
 * Component hierarchy:
 *   FeatureFlagsPage
 *   ├── Free SectionCard groups
 *   │   └── Toggle row per flag
 *   ├── UpgradePrompt banner
 *   ├── Paid SectionCard groups
 *   │   └── Locked toggle row per flag
 *   └── Footer (Saved message + Save button)
 */

'use client'

import { useState }                    from 'react'
import { useTranslations }             from 'next-intl'
import { FiCheck, FiLock, FiZap }      from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Flag
 *
 * Represents a single feature flag that can be toggled on or off.
 *
 * @property id          - Unique identifier for this flag (e.g. 'dark-mode').
 * @property label       - Human-readable name shown in the UI.
 * @property description - Short explanation of what enabling this flag does.
 * @property enabled     - Whether the flag is currently turned on.
 * @property paid        - Whether this flag requires a paid/hosted plan to use.
 */
type Flag = {
  id:          string
  label:       string
  description: string
  enabled:     boolean
  paid:        boolean
}

/**
 * FlagGroup
 *
 * A named group of related feature flags displayed together in a SectionCard.
 *
 * @property title - The group heading shown in the card header (e.g. "Appearance").
 * @property flags - The list of flags belonging to this group.
 */
type FlagGroup = {
  title: string
  flags: Flag[]
}

// ---------------------------------------------------------------------------
// Initial flag data
// ---------------------------------------------------------------------------

/**
 * initialGroups
 *
 * The full list of feature flag groups with their default enabled states.
 * Loaded into state when the page first mounts.
 *
 * Note: `title`, `label`, and `description` strings are translated at render
 * time using t('flags.<id>.label') etc. — the values here serve as fallbacks.
 */
const initialGroups: FlagGroup[] = [
  {
    title: 'Appearance',
    flags: [
      { id: 'dark-mode',          label: 'Dark Mode',                description: 'Allow users to switch between light and dark themes in the app',     enabled: true,  paid: false },
      { id: 'system-theme',       label: 'Follow System Theme',      description: 'Automatically match the device light/dark mode setting',             enabled: true,  paid: false },
    ],
  },
  {
    title: 'Localisation',
    flags: [
      { id: 'multi-language',     label: 'Multi-language Support',   description: 'Enable multiple language support in the generated app',              enabled: false, paid: false },
      { id: 'rtl-support',        label: 'RTL Support',              description: 'Right-to-left layout for Arabic, Hebrew and similar languages',      enabled: false, paid: false },
    ],
  },
  {
    title: 'App Behaviour',
    flags: [
      { id: 'offline-mode',       label: 'Offline Mode',             description: 'Cache data locally so the app works without an internet connection', enabled: false, paid: false },
      { id: 'push-notifications', label: 'Push Notifications',       description: 'Enable push notification support via FCM — you provide the keys',   enabled: false, paid: false },
      { id: 'splash-screen',      label: 'Splash Screen',            description: 'Show a branded splash screen when the app launches',                enabled: true,  paid: false },
      { id: 'onboarding',         label: 'Onboarding Flow',          description: 'Show a welcome/onboarding flow for new users',                      enabled: false, paid: false },
    ],
  },
  {
    title: 'Authentication — Paid',
    flags: [
      { id: '2fa',                label: 'Two-Factor Authentication', description: 'Require OTP or authenticator app for login',                       enabled: false, paid: true  },
      { id: 'biometric',          label: 'Biometric Login',          description: 'Fingerprint and Face ID login on mobile',                          enabled: false, paid: true  },
      { id: 'social-login',       label: 'Social Login',             description: 'Google, GitHub, Apple and Facebook OAuth',                         enabled: false, paid: true  },
      { id: 'magic-link',         label: 'Magic Link',               description: 'Passwordless login via email link',                                enabled: false, paid: true  },
      { id: 'sso',                label: 'SSO / SAML',               description: 'Enterprise single sign-on integration',                            enabled: false, paid: true  },
    ],
  },
  {
    title: 'Advanced — Paid',
    flags: [
      { id: 'analytics',          label: 'In-app Analytics',         description: 'Track screen views and events inside the generated app',            enabled: false, paid: true  },
      { id: 'ab-testing',         label: 'A/B Testing',              description: 'Run feature experiments across your user base',                     enabled: false, paid: true  },
      { id: 'feature-gating',     label: 'Feature Gating',           description: 'Show or hide features based on user plan or role',                 enabled: false, paid: true  },
    ],
  },
]

// ---------------------------------------------------------------------------
// Toggle — local sub-component
// ---------------------------------------------------------------------------

/**
 * Toggle
 *
 * A simple on/off toggle switch used for each feature flag row.
 *
 * Supports a `disabled` state for paid flags — when disabled, the toggle
 * is visually faded, clicking does nothing, and a not-allowed cursor is shown.
 *
 * @param checked   - Whether the toggle is currently on.
 * @param onChange  - Callback fired when the toggle is clicked (not called when disabled).
 * @param disabled  - When true, the toggle cannot be interacted with.
 */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked:   boolean
  onChange:  () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${checked && !disabled ? 'bg-gray-800' : 'bg-gray-300'}`}
    >
      {/* Sliding thumb — moves right when checked, left when unchecked */}
      <div
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// UpgradePrompt — local sub-component
// ---------------------------------------------------------------------------

/**
 * UpgradePrompt
 *
 * An amber-coloured banner shown above the paid feature groups.
 * Informs the user that paid flags require NXTFlutter's hosted plan,
 * and provides an "Upgrade" button to take action.
 *
 * All strings are translated internally via useTranslations.
 */
function UpgradePrompt() {
  const t = useTranslations('featureFlagsPage')

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
      <FiZap size={16} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">
          {t('upgrade.title')}
        </p>
        <p className="text-[11px] text-amber-600 mt-0.5">
          {t('upgrade.description')}
        </p>
      </div>
      <button className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-md hover:bg-amber-600 transition">
        {t('upgrade.button')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionCard — local sub-component
// ---------------------------------------------------------------------------

/**
 * SectionCard
 *
 * A titled card wrapper for a group of feature flags.
 * Supports two visual variants:
 * - Default (isPaid = false): grey header, grey border — for free flags.
 * - Paid    (isPaid = true):  amber header, amber border — for locked flags.
 *
 * @param title    - The group title shown in the card header.
 * @param isPaid   - Whether to use the amber "paid" visual variant.
 * @param children - The flag rows to render inside the card.
 */
function SectionCard({
  title,
  isPaid,
  children,
}: {
  title:    string
  isPaid?:  boolean
  children: React.ReactNode
}) {
  const t = useTranslations('featureFlagsPage')

  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${isPaid ? 'border-amber-200' : 'border-gray-200'}`}>

      {/* Card header — amber for paid groups, grey for free groups */}
      <div className={`px-5 py-3.5 border-b flex items-center gap-2 ${isPaid ? 'border-amber-100 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>

        {/* Lock icon — only shown for paid groups */}
        {isPaid && <FiLock size={13} className="text-amber-500 shrink-0" />}

        <h3 className={`text-sm font-semibold ${isPaid ? 'text-amber-800' : 'text-gray-800'}`}>
          {title}
        </h3>

        {/* "PAID" badge — only shown for paid groups, pushed to the right */}
        {isPaid && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
            {t('paidBadge')}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="px-5 py-2">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FeatureFlagsPage — main component
// ---------------------------------------------------------------------------

/**
 * FeatureFlagsPage
 *
 * The main exported page component for the Feature Flags theming section.
 *
 * State managed here:
 * - `groups` — The full list of flag groups with their current enabled states.
 * - `saving` — Whether the save action is in progress.
 * - `saved`  — Whether the last save was successful (shows confirmation).
 */
export default function FeatureFlagsPage() {
  /**
   * t — Translation function scoped to the 'featureFlagsPage' namespace.
   */
  const t = useTranslations('featureFlagsPage')

  /** The live list of flag groups. Updated as the user toggles flags. */
  const [groups, setGroups] = useState<FlagGroup[]>(initialGroups)

  /** Whether the save action is currently in progress. */
  const [saving, setSaving] = useState(false)

  /**
   * Whether to show the "Saved" confirmation message.
   * Auto-resets to false after 2.5 seconds.
   */
  const [saved,  setSaved]  = useState(false)

  // -------------------------------------------------------------------------
  // Flag toggle handler
  // -------------------------------------------------------------------------

  /**
   * toggleFlag
   *
   * Flips the `enabled` state of a single flag within a specific group.
   * Only called for free (non-paid) flags — paid flags use a disabled toggle.
   *
   * @param groupTitle - The title of the group containing the flag.
   * @param flagId     - The ID of the flag to toggle.
   */
  const toggleFlag = (groupTitle: string, flagId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.title === groupTitle
          ? {
              ...g,
              flags: g.flags.map((f) =>
                f.id === flagId ? { ...f, enabled: !f.enabled } : f
              ),
            }
          : g
      )
    )
  }

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  /**
   * handleSave
   *
   * Simulates saving the feature flags.
   * Currently uses a timeout to mimic an async API call (800ms delay).
   *
   * TODO: Replace the setTimeout with a real API call when the
   * save-feature-flags endpoint is available.
   */
  const handleSave = () => {
    setSaving(true)
    console.log(t('logs.savingFlags'))
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      console.log(t('logs.flagsSaved'))
      setTimeout(() => setSaved(false), 2500)
    }, 800)
  }

  // -------------------------------------------------------------------------
  // Separate free and paid groups for rendering
  // -------------------------------------------------------------------------

  /**
   * freeGroups — Groups where NOT all flags are paid (i.e. has at least one free flag).
   * Rendered first, without the amber paid styling.
   */
  const freeGroups = groups.filter((g) => !g.flags.every((f) => f.paid))

  /**
   * paidGroups — Groups where ALL flags are paid.
   * Rendered after the upgrade prompt, with amber paid styling and locked toggles.
   */
  const paidGroups = groups.filter((g) => g.flags.every((f) => f.paid))

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-5">

      {/* ------------------------------------------------------------------
        * Page heading and description
        * ------------------------------------------------------------------ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('subheading')}</p>
      </div>

      {/* ------------------------------------------------------------------
        * Free feature flag groups
        * Each group is a SectionCard with one toggle row per flag.
        * ------------------------------------------------------------------ */}
      {freeGroups.map((group) => (
        <SectionCard key={group.title} title={t(`groups.${group.title}`)}>
          {group.flags.map((flag, i) => (
            <div
              key={flag.id}
              className={`flex items-center gap-4 py-3 ${
                i < group.flags.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {/* Flag label and description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {t(`flags.${flag.id}.label`)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t(`flags.${flag.id}.description`)}
                </p>
              </div>

              {/* Interactive toggle */}
              <Toggle
                checked={flag.enabled}
                onChange={() => toggleFlag(group.title, flag.id)}
              />
            </div>
          ))}
        </SectionCard>
      ))}

      {/* ------------------------------------------------------------------
        * Upgrade prompt banner
        * Shown between free and paid groups to explain why paid flags
        * are locked and how to unlock them.
        * ------------------------------------------------------------------ */}
      <UpgradePrompt />

      {/* ------------------------------------------------------------------
        * Paid feature flag groups
        * Rendered with amber styling, a lock icon, and disabled toggles.
        * ------------------------------------------------------------------ */}
      {paidGroups.map((group) => (
        <SectionCard key={group.title} title={t(`groups.${group.title}`)} isPaid>
          {group.flags.map((flag, i) => (
            <div
              key={flag.id}
              className={`flex items-center gap-4 py-3 ${
                i < group.flags.length - 1 ? 'border-b border-amber-50' : ''
              }`}
            >
              {/* Flag label and description — muted to signal locked state */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">
                  {t(`flags.${flag.id}.label`)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t(`flags.${flag.id}.description`)}
                </p>
              </div>

              {/* Lock icon + disabled toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <FiLock size={12} className="text-amber-400" />
                <Toggle checked={false} onChange={() => {}} disabled />
              </div>
            </div>
          ))}
        </SectionCard>
      ))}

      {/* ------------------------------------------------------------------
        * Footer — Save action
        * Right-aligned save button with optional saved confirmation.
        * ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end gap-3 pt-1">

        {/* Saved confirmation — briefly visible after a successful save */}
        {saved && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <FiCheck size={13} /> {t('savedMessage')}
          </p>
        )}

        {/* Save button — disabled while saving, shows spinner during save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {saving && (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {saving ? t('saveButtonSaving') : t('saveButtonIdle')}
        </button>
      </div>

    </div>
  )
}