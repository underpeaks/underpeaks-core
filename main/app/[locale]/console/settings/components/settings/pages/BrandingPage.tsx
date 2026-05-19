/**
 * BrandingPage Component
 *
 * This is the Branding settings page, found inside the CMS Settings area.
 * It allows the user to upload and save a custom logo and favicon for their CMS.
 *
 * What this page does:
 * - Reads the currently saved logo and favicon URLs from the global config store
 *   (via `useConsoleStore`) and pre-fills the upload zones with them.
 * - Lets the user upload a new logo (recommended 200×60px) and/or favicon
 *   (recommended 32×32px or 64×64px) using the `UploadZone` component.
 * - Shows a live "Topnav Preview" beneath each upload zone so the user can
 *   see exactly how the logo/favicon will look in the navigation bar.
 * - On "Save Branding", sends the new URLs to the server and updates the
 *   global config store so the rest of the CMS reflects the change immediately.
 * - Shows a green "Branding saved successfully" confirmation for 2.5 seconds
 *   after a successful save.
 * - Shows a dismissable red error banner if the save fails.
 *
 * Local SectionCard component:
 * - A small reusable card defined in this file (not imported) used to wrap
 *   each settings section with a titled header and padded body.
 */

'use client'

import { useState, useEffect }                from 'react'
import { useTranslations }                    from 'next-intl'
import { FiX, FiCheck, FiAlertCircle }        from 'react-icons/fi'
import { useConsoleStore }                    from '@/app/store/consoleStore'
import { UploadZone }                         from '@/app/lib/uploads/UploadZone'
import { UploadResult }                       from '@/app/lib/uploads/types'

// ---------------------------------------------------------------------------
// SectionCard — Local layout component
// ---------------------------------------------------------------------------

/**
 * SectionCard
 *
 * A simple card wrapper used to group related settings fields together.
 * Renders a grey titled header bar and a white padded content area below it.
 *
 * This is defined locally in this file because it is only used here.
 * If it is needed in other pages, it should be moved to the shared `ui` folder.
 *
 * @param title    - The heading text shown in the card's header bar.
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
      {/* Card header — grey background with bold title */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {/* Card body — white background with vertical gap between children */}
      <div className="px-5 py-4 flex flex-col gap-5">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BrandingPage
// ---------------------------------------------------------------------------

/**
 * BrandingPage
 *
 * The main exported page component for the Branding settings section.
 *
 * State managed here:
 * - `logoUrl`    — The URL of the currently selected/uploaded logo image.
 * - `faviconUrl` — The URL of the currently selected/uploaded favicon image.
 * - `saving`     — Whether the save API request is in progress.
 * - `saved`      — Whether the last save was successful (controls success message).
 * - `error`      — Error message string shown in the red banner, or null if none.
 */
export default function BrandingPage() {
  /**
   * t — Translation function scoped to the 'brandingPage' namespace.
   * Use t('key') to get the translated string for that key.
   */
  const t = useTranslations('brandingPage')

  /**
   * Pull global state from the console store:
   * - `config`     — The full CMS configuration object (includes branding URLs).
   * - `user`       — The currently logged-in user (needed for the save API call).
   * - `loadConfig` — Function to update the global config after a successful save.
   */
  const { config, user, loadConfig } = useConsoleStore()

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** The logo image URL — pre-filled from config, updated when user uploads. */
  const [logoUrl,    setLogoUrl]    = useState<string>('')

  /** The favicon image URL — pre-filled from config, updated when user uploads. */
  const [faviconUrl, setFaviconUrl] = useState<string>('')

  /** Whether the save request is currently in progress. */
  const [saving,     setSaving]     = useState(false)

  /**
   * Whether to show the "saved successfully" confirmation message.
   * Set to true after a successful save, then automatically reset after 2.5s.
   */
  const [saved,      setSaved]      = useState(false)

  /** The current error message, or null if there is no error to display. */
  const [error,      setError]      = useState<string | null>(null)

  /**
   * The current project name shown in the topnav preview.
   * Falls back to 'Default' if the config hasn't loaded yet.
   */
  const projectName = config?.project_name ?? 'Default'

  // -------------------------------------------------------------------------
  // Sync state from config on load
  // -------------------------------------------------------------------------

  /**
   * useEffect — Pre-fill logo and favicon URLs from the global config.
   *
   * Runs whenever `config` changes (including the initial load).
   * This ensures that if the config loads after the component mounts,
   * the upload zones still get pre-filled with the saved values.
   */
  useEffect(() => {
    if (config?.branding?.logo_url)    setLogoUrl(config.branding.logo_url)
    if (config?.branding?.favicon_url) setFaviconUrl(config.branding.favicon_url)
  }, [config])

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

  /**
   * handleSave
   *
   * Called when the user clicks the "Save Branding" button.
   *
   * Steps:
   * 1. Sends a POST request to `/api/update-branding` with the user ID,
   *    logo URL, and favicon URL.
   * 2. On success:
   *    - Updates the global config store with the new branding values so the
   *      rest of the CMS reflects the change immediately without a page reload.
   *    - Shows the green "saved" confirmation message for 2.5 seconds.
   * 3. On failure:
   *    - Reads the error message from the server response and shows it
   *      in the red error banner.
   */
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    console.log(t('logs.savingBranding'))

    try {
      const res = await fetch('/api/update-branding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:     user?.user_id,
          logo_url:    logoUrl,
          favicon_url: faviconUrl,
        }),
      })

      if (res.ok) {
        /**
         * Update the global config store with the new branding values.
         * We spread the existing config and branding to preserve all other
         * config fields and only update the two branding URLs we changed.
         */
        loadConfig({
          ...(config ?? {}),
          branding: {
            ...(config?.branding ?? {}),
            logo_url:    logoUrl,
            favicon_url: faviconUrl,
          },
        })

        setSaved(true)
        console.log(t('logs.brandingSaved'))

        // Automatically hide the success message after 2.5 seconds
        setTimeout(() => setSaved(false), 2500)
      } else {
        const data = await res.json()
        setError(data.error ?? t('errors.saveFailed'))
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
        <h2 className="text-lg font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('subheading')}</p>
      </div>

      {/* ------------------------------------------------------------------
        * Error Banner
        * Only shown when `error` is non-null.
        * The X button clears the error state to dismiss the banner.
        * ------------------------------------------------------------------ */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <FiAlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <FiX size={13} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------
        * Logo Section
        * Lets the user upload a logo image.
        * Shows a topnav preview beneath the upload zone.
        * ------------------------------------------------------------------ */}
      <SectionCard title={t('logoSection.title')}>

        {/* Upload zone for the logo image */}
        <UploadZone
          config={{
            folder:      'images/logo',
            fileType:    'image',
            maxSizeKb:   512,
            label:       t('logoSection.uploadLabel'),
            hint:        t('logoSection.uploadHint'),
            recommended: t('logoSection.uploadRecommended'),
            resize:      { width: 400, height: 120, fit: 'inside' },
          }}
          initialPreview={config?.branding?.logo_url || null}
          onUploaded={(r: UploadResult) => setLogoUrl(r.url)}
          onError={setError}
          onClear={() => setLogoUrl('')}
        />

        {/* Topnav preview — shows how the logo will appear in the nav bar */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {t('preview.label')}
          </p>
          <div className="flex items-center gap-3 px-5 h-14 bg-white border border-gray-200 rounded-lg shadow-sm">

            {/* Logo preview image — falls back to the default logo if none uploaded */}
            <img
              src={logoUrl || '/images/logo/NXT_Flutter_logo.png'}
              alt={t('logoSection.imageAlt')}
              className="h-7 w-auto object-contain"
            />

            {/* Project name badge — shows alongside the logo as it would in the nav */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-200 bg-gray-50 ml-2">
              <span className="text-[10px] text-gray-400">{t('preview.projectLabel')}</span>
              <span className="text-xs font-semibold text-gray-600">{projectName}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------
        * Favicon Section
        * Lets the user upload a favicon image.
        * Shows a topnav preview beneath the upload zone.
        * ------------------------------------------------------------------ */}
      <SectionCard title={t('faviconSection.title')}>

        {/* Upload zone for the favicon image */}
        <UploadZone
          config={{
            folder:      'images/favicon',
            fileType:    'image',
            maxSizeKb:   256,
            label:       t('faviconSection.uploadLabel'),
            hint:        t('faviconSection.uploadHint'),
            recommended: t('faviconSection.uploadRecommended'),
            resize:      { width: 64, height: 64, fit: 'cover' },
          }}
          initialPreview={config?.branding?.favicon_url || null}
          onUploaded={(r: UploadResult) => setFaviconUrl(r.url)}
          onError={setError}
          onClear={() => setFaviconUrl('')}
        />

        {/* Topnav preview — shows how the favicon will appear in the nav bar */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">
            {t('preview.label')}
          </p>
          <div className="flex items-center gap-3 px-5 h-14 bg-white border border-gray-200 rounded-lg shadow-sm">

            {/* Favicon preview image — falls back to the default favicon if none uploaded */}
            <img
              src={faviconUrl || '/images/favicon/NXT_Flutter_favicon.png'}
              alt={t('faviconSection.imageAlt')}
              className="h-7 w-auto object-contain"
            />

            {/* Project name badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-200 bg-gray-50 ml-2">
              <span className="text-[10px] text-gray-400">{t('preview.projectLabel')}</span>
              <span className="text-xs font-semibold text-gray-600">{projectName}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------------
        * Save Row
        * Shows the success message on the left (when saved) and the
        * Save button on the right. The button is disabled while saving.
        * ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between pt-1">

        {/* Success confirmation — only visible for 2.5s after a successful save */}
        {saved && (
          <p className="text-xs text-green-600 flex items-center gap-1.5">
            <FiCheck size={13} />
            {t('saveSuccess')}
          </p>
        )}

        {/* Save button — pushed to the right with ml-auto */}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {/* Spinner — only shown while the save request is in progress */}
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {/* Label — switches between idle and saving states */}
            {saving ? t('saveButtonSaving') : t('saveButtonIdle')}
          </button>
        </div>
      </div>

    </div>
  )
}