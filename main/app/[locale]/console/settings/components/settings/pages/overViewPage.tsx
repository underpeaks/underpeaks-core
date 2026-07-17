/**
 * OverviewPage Component
 *
 * This is the Project Overview page inside the CMS Settings area.
 * It gives the user a high-level snapshot of their self-hosted Underpeaks
 * project and lets them update key project settings.
 *
 * What this page does:
 * - Displays a 4-tile stats grid showing: DB Type, Environment,
 *   Deployment type, and Status — all read from the global config/env vars.
 * - Shows a "User Info" section (full name, email, role, etc.) pulled
 *   from the logged-in user object in the global store.
 * - Lets the user save or update their NXT Flutter License Key, which
 *   authenticates their self-hosted instance.
 * - Lets the user update their Project Name and Project URL.
 * - Both save actions call the same `/api/update-project-settings` endpoint
 *   and update the global config store on success.
 *
 * Component hierarchy:
 *   OverviewPage
 *   ├── Stats grid (inline)
 *   ├── SectionCard "NXT Flutter License Key"
 *   ├── SectionCard "Project Info"
 *   └── SaveButton
 */

'use client'

import { useState, useEffect }                    from 'react'
//import { useTranslations }                        from 'next-intl'
import { SectionCard, Input, SaveButton, FormField } from '../../ui'
import { useConsoleStore }                        from '@/app/store/consoleStore'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * OverviewPage
 *
 * The main exported page component for the Project Overview settings section.
 *
 * State managed here:
 * - `projectName`   — The editable project name input value.
 * - `projectUrl`    — The editable project URL input value.
 * - `nxfApiKey`     — The editable NXT Flutter license key input value.
 * - `apiKeySaved`   — Whether the license key was just saved successfully.
 * - `apiKeySaving`  — Whether the license key save request is in progress.
 * - `saving`        — Whether the project info save request is in progress.
 * - `saved`         — Whether the project info was just saved successfully.
 */
export default function OverviewPage() {
  /**
   * t — Translation function scoped to the 'overviewPage' namespace.
   * Use t('key') to get the translated string for that key.
   */
  //const t = useTranslations('overviewPage')

  /**
   * Pull global state from the console store:
   * - `config`     — Full CMS config object (project name, URL, keys, etc.).
   * - `user`       — The currently logged-in user's profile data.
   * - `loadConfig` — Updates the global config after a successful save.
   */
  const { config, user, loadConfig } = useConsoleStore()

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Editable project name — pre-filled from config on load. */
  const [projectName,   setProjectName]   = useState('')

  /** Editable project URL — pre-filled from config or env var on load. */
  const [projectUrl,    setProjectUrl]    = useState('')

  /** Editable NXT Flutter license key — pre-filled from config on load. */
  const [nxfApiKey,     setNxfApiKey]     = useState('')

  /**
   * Whether the license key was just saved successfully.
   * Set to true after a successful save, auto-resets after 3 seconds.
   */
  const [apiKeySaved,   setApiKeySaved]   = useState(false)

  /** Whether the license key save request is currently in progress. */
  const [apiKeySaving,  setApiKeySaving]  = useState(false)

  /** Whether the project info save request is currently in progress. */
  const [saving,        setSaving]        = useState(false)

  /**
   * Whether the project info was just saved successfully.
   * Set to true after a successful save, auto-resets after 3 seconds.
   */
  const [saved,         setSaved]         = useState(false)

  // -------------------------------------------------------------------------
  // Sync state from config on load
  // -------------------------------------------------------------------------

  /**
   * useEffect — Pre-fill all form inputs from the global config.
   *
   * Runs whenever `config` changes (including the first time it loads).
   * Falls back to env variables where available (e.g. project URL).
   */
  useEffect(() => {
    if (config) {
      setProjectName(config.project_name ?? '')
      setProjectUrl(config.project_url   ?? process.env.NEXT_PUBLIC_APP_DOMAIN ?? '')
      setNxfApiKey(config.nxf_api_key    ?? '')
    }
  }, [config])

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * capitalize
   *
   * Converts a snake_case or lowercase string into Title Case for display.
   * Examples:
   *   "self_hosted"  → "Self Hosted"
   *   "development"  → "Development"
   *   undefined      → "—"
   *
   * @param s - The string to format, or undefined.
   * @returns  The formatted string, or "—" if input is falsy.
   */
  const capitalize = (s?: string) =>
    s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'

  // -------------------------------------------------------------------------
  // Derived data for display
  // -------------------------------------------------------------------------

  /**
   * dbType — The database type (e.g. "postgres").
   * Prefers the env variable so it works before config loads.
   */
  const dbType = process.env.NEXT_PUBLIC_DB_TYPE ?? config?.db_type

  /**
   * env — The current runtime environment (e.g. "development", "production").
   * Prefers the Node.js env variable for accuracy.
   */
  const env = process.env.NODE_ENV ?? config?.environment

  /**
   * stats — The four info tiles shown in the stats grid.
   * Each has a translated label and a formatted value.
   */
  const stats = [
    { label: ('stats.dbType'),     value: capitalize(dbType)                  },
    { label: ('stats.environment'), value: capitalize(env)                    },
    { label: ('stats.deployment'),  value: capitalize(config?.deployment_type) },
    { label: ('stats.status'),      value: ('stats.statusActive')            },
  ]

  /**
   * userInfo — The rows shown in the User Info section.
   * Each has a translated label and a value from the user object.
   * Falls back to "—" for any missing field.
   */
  const userInfo = [
    { label: ('userInfo.fullName'),    value: user?.full_name  ?? '—' },
    { label: ('userInfo.email'),       value: user?.user_email ?? '—' },
    { label: ('userInfo.role'),        value: user?.role       ?? '—' },
    { label: ('userInfo.status'),      value: user?.status     ?? '—' },
    {
      label: ('userInfo.verified'),
      value: user?.email_verified ? ('userInfo.verifiedYes') : ('userInfo.verifiedNo'),
    },
    {
      label: ('userInfo.memberSince'),
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString()
        : '—',
    },
  ]

  // -------------------------------------------------------------------------
  // Save license key
  // -------------------------------------------------------------------------

  /**
   * handleSaveApiKey
   *
   * Saves the NXT Flutter license key to the server.
   *
   * Steps:
   * 1. Guards against empty input.
   * 2. POSTs to `/api/update-project-settings` with the current project
   *    name, URL, and the new license key.
   * 3. On success, updates the global config and shows the saved confirmation
   *    for 3 seconds.
   */
  const handleSaveApiKey = async () => {
    if (!nxfApiKey.trim()) return

    setApiKeySaving(true)
    setApiKeySaved(false)
    console.log(('logs.savingLicenseKey'))

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
        // Update only the license key in the global config
        loadConfig({ ...(config ?? {}), nxf_api_key: nxfApiKey })
        setApiKeySaved(true)
        console.log(('logs.licenseKeySaved'))
        setTimeout(() => setApiKeySaved(false), 3000)
      }
    } finally {
      setApiKeySaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Save project info
  // -------------------------------------------------------------------------

  /**
   * handleSave
   *
   * Saves the project name and project URL to the server.
   *
   * Steps:
   * 1. POSTs to `/api/update-project-settings` with the current values.
   * 2. On success, updates the global config with the new name and URL,
   *    and shows the saved confirmation for 3 seconds.
   */
  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    console.log(('logs.savingProjectInfo'))

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
        // Update only the project name and URL in the global config
        loadConfig({
          ...(config ?? {}),
          project_name: projectName,
          project_url:  projectUrl,
        })
        setSaved(true)
        console.log(('logs.projectInfoSaved'))
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
        * Stats Grid
        * Four tiles in a 2-column grid showing system/environment info.
        * Values are read-only — the user cannot edit them here.
        * ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg px-5 py-4">
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------
        * NXT Flutter License Key Section
        * Allows the user to enter or update their license key.
        * The save button label changes based on whether a key already exists:
        *   - No key saved yet  → "Save"
        *   - Key exists        → "Update"
        *   - Saving in progress → "Saving…"
        *   - Just saved        → "✓ Saved"
        * A masked preview of the key on file is shown below the input.
        * ------------------------------------------------------------------ */}
      <SectionCard title={('licenseKey.sectionTitle')}>
        <p className="text-xs text-gray-400 mb-3">
          {('licenseKey.description')}
        </p>

        <FormField label={('licenseKey.inputLabel')}>
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                value={nxfApiKey}
                onChange={setNxfApiKey}
                placeholder={('licenseKey.inputPlaceholder')}
              />
            </div>

            {/*
             * Save/Update button for the license key.
             * Disabled while saving or if the input is empty.
             * Label cycles through: Saving… → ✓ Saved → Update / Save
             */}
            <button
              onClick={handleSaveApiKey}
              disabled={apiKeySaving || !nxfApiKey.trim()}
              className="shrink-0 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {apiKeySaving
                ? ('licenseKey.buttonSaving')
                : apiKeySaved
                  ? ('licenseKey.buttonSaved')
                  : nxfApiKey && config?.nxf_api_key
                    ? ('licenseKey.buttonUpdate')
                    : ('licenseKey.buttonSave')
              }
            </button>
          </div>
        </FormField>

        {/* Masked key preview — only shown if a key is already saved in config */}
        {config?.nxf_api_key && (
          <p className="text-[11px] text-gray-400 mt-1">
           License key on file: {config.nxf_api_key.slice(0, 12)}...
          </p>
        )}
      </SectionCard>

      {/* ------------------------------------------------------------------
        * Project Info Section
        * Lets the user update the project name and public URL.
        * ------------------------------------------------------------------ */}
      <SectionCard title={('projectInfo.sectionTitle')}>
        <FormField label={('projectInfo.nameLabel')}>
          <Input
            value={projectName}
            onChange={setProjectName}
            placeholder={('projectInfo.namePlaceholder')}
          />
        </FormField>

        <FormField
          label={('projectInfo.urlLabel')}
          hint={('projectInfo.urlHint')}
        >
          <Input
            value={projectUrl}
            onChange={setProjectUrl}
            placeholder={('projectInfo.urlPlaceholder')}
          />
        </FormField>
      </SectionCard>

      {/* Save button for project info — provided by the shared SaveButton component */}
      <SaveButton onClick={handleSave} saving={saving} saved={saved} />

    </div>
  )
}