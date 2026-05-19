/**
 * ColoursPage Component
 *
 * This is the Colours settings page inside the CMS Theming section.
 * It allows the user to customise the colour tokens that are used across
 * their generated Flutter and Next.js apps.
 *
 * What this page does:
 * - Displays a list of named colour tokens (e.g. Primary, Accent, Danger)
 *   each with a colour picker, a hex value input, and a reset-to-default button.
 * - Shows a live preview strip at the top that updates in real time as the
 *   user changes colours, so they can see the effect immediately.
 * - Lets the user reset a single token to its default, or reset all tokens
 *   at once via the "Reset all to defaults" button.
 * - On "Save Colours", simulates a save (currently uses a timeout — no API
 *   call yet) and shows a brief "Saved" confirmation message.
 *
 * Local SectionCard component:
 * - Defined locally in this file (same pattern as BrandingPage).
 * - Should be moved to the shared /ui folder if needed elsewhere.
 *
 * Component hierarchy:
 *   ColoursPage
 *   ├── Live Preview strip (inline)
 *   ├── SectionCard "Colour Tokens"
 *   │   └── One row per ColorToken
 *   └── Footer actions (Reset all / Save)
 */

'use client'

import { useState }              from 'react'
import { useTranslations }       from 'next-intl'
import { FiCheck, FiRefreshCw }  from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * ColorToken
 *
 * Represents a single named colour in the design system.
 *
 * @property id          - Unique identifier used to look up and update this token
 *                         (e.g. 'primary', 'accent', 'danger').
 * @property label       - Human-readable name shown in the UI (e.g. "Primary").
 * @property description - Short explanation of where this colour is used.
 * @property value       - The current hex colour value (may differ from default
 *                         if the user has changed it).
 * @property default     - The original default hex value, used when resetting.
 */
type ColorToken = {
  id:          string
  label:       string
  description: string
  value:       string
  default:     string
}

// ---------------------------------------------------------------------------
// Initial token data
// ---------------------------------------------------------------------------

/**
 * initialTokens
 *
 * The full list of colour tokens with their default values.
 * These are the starting values loaded into state when the page first mounts.
 *
 * Note: `label` and `description` are hardcoded in English here as fallbacks.
 * They are overridden at render time with translated values from the
 * 'coloursPage.tokens' namespace (see inside the component below).
 */
const initialTokens: ColorToken[] = [
  { id: 'primary',      label: 'Primary',             description: 'Main brand colour — buttons, links, highlights', value: '#111827', default: '#111827' },
  { id: 'primary-fg',   label: 'Primary Foreground',  description: 'Text on primary colour backgrounds',             value: '#FFFFFF', default: '#FFFFFF' },
  { id: 'secondary',    label: 'Secondary',            description: 'Supporting brand colour',                        value: '#6B7280', default: '#6B7280' },
  { id: 'secondary-fg', label: 'Secondary Foreground', description: 'Text on secondary colour backgrounds',           value: '#FFFFFF', default: '#FFFFFF' },
  { id: 'accent',       label: 'Accent',               description: 'Highlight colour for badges and tags',           value: '#3B82F6', default: '#3B82F6' },
  { id: 'background',   label: 'Background',           description: 'Main app background',                            value: '#F9FAFB', default: '#F9FAFB' },
  { id: 'surface',      label: 'Surface',              description: 'Card and panel background',                      value: '#FFFFFF', default: '#FFFFFF' },
  { id: 'border',       label: 'Border',               description: 'Default border colour',                          value: '#E5E7EB', default: '#E5E7EB' },
  { id: 'success',      label: 'Success',              description: 'Positive states and confirmations',              value: '#10B981', default: '#10B981' },
  { id: 'warning',      label: 'Warning',              description: 'Warnings and caution states',                    value: '#F59E0B', default: '#F59E0B' },
  { id: 'danger',       label: 'Danger',               description: 'Errors and destructive actions',                 value: '#EF4444', default: '#EF4444' },
  { id: 'text',         label: 'Text Primary',         description: 'Main body text colour',                          value: '#111827', default: '#111827' },
  { id: 'text-muted',   label: 'Text Muted',           description: 'Secondary and placeholder text',                 value: '#6B7280', default: '#6B7280' },
]

// ---------------------------------------------------------------------------
// SectionCard — Local layout component
// ---------------------------------------------------------------------------

/**
 * SectionCard
 *
 * A simple card wrapper used to group related content under a titled header.
 * Identical in structure to the shared SectionCard in /ui — defined locally
 * here as this file predates the shared version.
 *
 * @param title    - The heading text shown in the card's grey header bar.
 * @param children - The content to render inside the card body.
 */
function SectionCard({
  title,
  children,
}: {
  title:    string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ColoursPage
// ---------------------------------------------------------------------------

/**
 * ColoursPage
 *
 * The main exported page component for the Colours theming section.
 *
 * State managed here:
 * - `tokens`  — The current list of colour tokens with their live values.
 * - `saving`  — Whether the save action is in progress.
 * - `saved`   — Whether the last save was successful (shows confirmation).
 */
export default function ColoursPage() {
  /**
   * t — Translation function scoped to the 'coloursPage' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('coloursPage')

  /** The live list of colour tokens. Updated as the user changes colours. */
  const [tokens, setTokens] = useState<ColorToken[]>(initialTokens)

  /** Whether the save action is currently in progress. */
  const [saving, setSaving] = useState(false)

  /**
   * Whether to show the "Saved" confirmation message.
   * Auto-resets to false after 2.5 seconds.
   */
  const [saved,  setSaved]  = useState(false)

  // -------------------------------------------------------------------------
  // Token update helpers
  // -------------------------------------------------------------------------

  /**
   * updateToken
   *
   * Updates the `value` of a single colour token by its ID.
   * Called when the user picks a new colour or types a hex value.
   *
   * @param id    - The ID of the token to update (e.g. 'primary').
   * @param value - The new hex colour string (e.g. '#FF0000').
   */
  const updateToken = (id: string, value: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, value } : t))
    )
  }

  /**
   * resetToken
   *
   * Resets a single colour token back to its original default value.
   * Called when the user clicks the reset (↺) button on a specific token row.
   *
   * @param id - The ID of the token to reset (e.g. 'accent').
   */
  const resetToken = (id: string) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, value: t.default } : t))
    )
  }

  /**
   * resetAll
   *
   * Resets ALL colour tokens back to their original default values.
   * Called when the user clicks "Reset all to defaults" in the footer.
   */
  const resetAll = () => {
    setTokens((prev) => prev.map((t) => ({ ...t, value: t.default })))
  }

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  /**
   * handleSave
   *
   * Simulates saving the colour tokens.
   * Currently uses a timeout to mimic an async API call (800ms delay).
   *
   * TODO: Replace the setTimeout with a real API call when the
   * save-theming endpoint is available.
   *
   * After "saving":
   * - Shows the green "Saved" confirmation for 2.5 seconds.
   */
  const handleSave = () => {
    setSaving(true)
    console.log(t('logs.savingColours'))
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      console.log(t('logs.coloursSaved'))
      setTimeout(() => setSaved(false), 2500)
    }, 800)
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
        <h2 className="text-lg font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('subheading')}</p>
      </div>

      {/* ------------------------------------------------------------------
        * Live Preview Strip
        * Shows real buttons, badges, and status labels using the current
        * token values via inline `style` props. Updates instantly as the
        * user changes any colour.
        * ------------------------------------------------------------------ */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-700">{t('preview.title')}</p>
        </div>
        <div className="px-5 py-4 flex items-center gap-3 flex-wrap">

          {/* Primary button preview */}
          <button
            style={{
              backgroundColor: tokens.find((t) => t.id === 'primary')?.value,
              color:           tokens.find((t) => t.id === 'primary-fg')?.value,
            }}
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            {t('preview.primaryButton')}
          </button>

          {/* Secondary button preview */}
          <button
            style={{
              backgroundColor: tokens.find((t) => t.id === 'secondary')?.value,
              color:           tokens.find((t) => t.id === 'secondary-fg')?.value,
            }}
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            {t('preview.secondaryButton')}
          </button>

          {/* Accent badge preview — uses 20% opacity background and 40% border */}
          <span
            style={{
              backgroundColor: tokens.find((t) => t.id === 'accent')?.value + '20',
              color:           tokens.find((t) => t.id === 'accent')?.value,
              borderColor:     tokens.find((t) => t.id === 'accent')?.value + '40',
            }}
            className="px-3 py-1 rounded-full text-xs font-medium border"
          >
            {t('preview.accentBadge')}
          </span>

          {/* Status colour previews */}
          <span style={{ color: tokens.find((t) => t.id === 'success')?.value }} className="text-sm font-medium">
            {t('preview.success')}
          </span>
          <span style={{ color: tokens.find((t) => t.id === 'warning')?.value }} className="text-sm font-medium">
            {t('preview.warning')}
          </span>
          <span style={{ color: tokens.find((t) => t.id === 'danger')?.value  }} className="text-sm font-medium">
            {t('preview.danger')}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------
        * Colour Tokens List
        * One row per token showing: colour picker, label + description,
        * hex input, and a reset-to-default button.
        * ------------------------------------------------------------------ */}
      <SectionCard title={t('tokensSectionTitle')}>
        <div className="flex flex-col gap-1">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0"
            >
              {/* --------------------------------------------------------
                * Colour Picker
                * The visible swatch (coloured box) is a styled div.
                * The actual native <input type="color"> is invisible
                * (opacity-0) but positioned on top of the swatch, so
                * clicking the swatch opens the browser colour picker.
                * -------------------------------------------------------- */}
              <div className="relative shrink-0">
                <div
                  className="w-9 h-9 rounded-md border border-gray-200 shadow-sm cursor-pointer overflow-hidden"
                  style={{ backgroundColor: token.value }}
                >
                  <input
                    type="color"
                    value={token.value}
                    onChange={(e) => updateToken(token.id, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Token label and description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {t(`tokens.${token.id}.label`)}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {t(`tokens.${token.id}.description`)}
                </p>
              </div>

              {/* --------------------------------------------------------
                * Hex value input
                * Lets the user type a hex colour directly.
                * Validates that the value matches #RRGGBB format before
                * updating, so partial typing (e.g. "#FF") is allowed but
                * invalid characters are rejected.
                * -------------------------------------------------------- */}
              <input
                type="text"
                value={token.value}
                onChange={(e) => {
                  const v = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) updateToken(token.id, v)
                }}
                className="w-24 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 text-center"
              />

              {/* Reset single token button */}
              <button
                onClick={() => resetToken(token.id)}
                title={t('resetTokenTitle')}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition shrink-0"
              >
                <FiRefreshCw size={12} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------
        * Footer Actions
        * Left: "Reset all to defaults" text button.
        * Right: "Saved" confirmation (when visible) + "Save Colours" button.
        * ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between pt-1">

        {/* Reset all tokens to their default values */}
        <button
          onClick={resetAll}
          className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition"
        >
          {t('resetAllButton')}
        </button>

        <div className="flex items-center gap-3">

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

    </div>
  )
}