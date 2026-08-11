/**
 * installerStore.ts
 *
 * The global client-side state store for the NXF installation wizard.
 *
 * What is this store for?
 *   The installer is a multi-step setup wizard that a developer runs once
 *   when deploying a new NXF project. Across multiple steps (project basics,
 *   database selection, admin user creation, branding, etc.) the user fills
 *   in configuration values. This Zustand store acts as the single source of
 *   truth for all of those values as the user progresses through the steps.
 *
 *   When the wizard is complete, the collected values are submitted to the
 *   server to bootstrap the project's database and system configuration.
 *
 * Why Zustand instead of local component state?
 *   The installer spans multiple pages/steps. If each step used its own
 *   local useState, values entered in step 1 would be lost when the user
 *   navigates to step 3. A global store persists the values across all
 *   steps for the duration of the wizard session.
 *
 * Store sections (mirroring the installer steps):
 *   PROJECT BASICS   — project name, domain, stack choice, and DB selection.
 *   FEATURES         — optional feature toggles (e-commerce, demo content).
 *   DATABASE CONFIG  — connection details for the selected database.
 *   ADMIN USER       — credentials for the first admin account.
 *   MODELS           — data models the project will use.
 *   BRANDING         — logo and primary colour for the console UI.
 *
 * Actions:
 *   setInstallerValue — generic setter for any single store field.
 *   resetInstaller    — resets all fields back to their defaults (used if the
 *                       user cancels or restarts the wizard).
 *
 * How to use in a component:
 *   import { useInstallerStore } from '@/stores/installerStore'
 *
 *   // Read a value
 *   const projectName = useInstallerStore((state) => state.projectName)
 *
 *   // Update a value
 *   const setInstallerValue = useInstallerStore((state) => state.setInstallerValue)
 *   setInstallerValue('projectName', 'My App')
 */

import { create }              from 'zustand'
import { DBType, DBConfig }    from '../db-adapter/types'

// ---------------------------------------------------------------------------
// Type definition
// ---------------------------------------------------------------------------

/**
 * InstallerState
 *
 * The complete shape of the installer Zustand store — both data fields
 * (the values collected from the user) and action functions (methods that
 * update those values).
 *
 * ── PROJECT BASICS ──────────────────────────────────────────────────────────
 *
 * @property projectName          - Human-readable name of the new project.
 *                                  Used as a display label and stored in
 *                                  SystemConfig as project_name.
 *
 * @property domain               - The primary domain for the deployment
 *                                  (e.g. 'acme.com').
 *
 * @property subdomain            - Optional subdomain prefix
 *                                  (e.g. 'admin' → 'admin.acme.com').
 *
 * @property selectedProjectType  - The project template to scaffold.
 *                                  Default: 'blank' (no pre-built pages).
 *                                  Other values depend on available templates.
 *
 * @property selectedPages        - An array of page identifiers the user has
 *                                  chosen to include in the project scaffold.
 *
 * @property selectedStack        - Which technology stack to generate code for:
 *                                    'next'    — Next.js only
 *                                    'flutter' — Flutter only
 *                                    'cms'     — CMS/admin panel only
 *                                    'both'    — Next.js + Flutter (default)
 *
 * @property selectedDb           - Which database adapter to use, or null if
 *                                  the user hasn't chosen yet.
 *                                  Must be one of the DBType union values.
 *
 * ── FEATURES ────────────────────────────────────────────────────────────────
 *
 * @property ecommerceEnabled     - Whether to scaffold e-commerce features
 *                                  (product catalogue, cart, orders, etc.).
 *
 * @property demoContentEnabled   - Whether to seed the database with demo
 *                                  content so the project has data to display
 *                                  immediately after installation.
 *
 * ── DATABASE CONFIG ──────────────────────────────────────────────────────────
 *
 * @property dbConfig             - Connection configuration for the selected
 *                                  database. Extends the DBConfig discriminated
 *                                  union (which varies by database type) with
 *                                  an optional storageBucket field used by
 *                                  Firebase Cloud Storage.
 *
 *                                  Default type is 'supabase' — this is just
 *                                  a starting point and is replaced when the
 *                                  user selects their database in the wizard.
 *
 * ── ADMIN USER ───────────────────────────────────────────────────────────────
 *
 * @property adminUser            - Credentials for the first admin account
 *                                  that will be created during installation.
 *                                    fullName — the admin's display name.
 *                                    email    — login email address.
 *                                    password — initial password (should be
 *                                               changed after first login).
 *
 * ── MODELS ──────────────────────────────────────────────────────────────────
 *
 * @property models               - An array of data model definitions that
 *                                  will be used to generate database schema
 *                                  and CRUD pages. Typed as any[] because the
 *                                  model schema is flexible and defined
 *                                  elsewhere.
 *
 * ── BRANDING ────────────────────────────────────────────────────────────────
 *
 * @property branding             - Visual identity settings for the console UI.
 *                                    logoUrl      — URL or path to the logo image.
 *                                    primaryColor — hex colour for the primary
 *                                                   UI accent (default: '#000000').
 *
 * ── ACTIONS ─────────────────────────────────────────────────────────────────
 *
 * @property setInstallerValue    - Generic type-safe setter for any single
 *                                  field in the store. See below for details.
 *
 * @property resetInstaller       - Resets all fields to their initial default
 *                                  values. Call this if the user cancels the
 *                                  wizard or starts over.
 */
export type InstallerState = {
  // Project basics
  projectName:         string
  domain:              string
  subdomain:           string
  selectedProjectType: string
  selectedPages:       string[]
  selectedStack:       'next' | 'flutter' | 'cms' | 'both'
  selectedDb:          DBType | null
  installed:           boolean
  // Features
  ecommerceEnabled:    boolean
  demoContentEnabled:  boolean
  studioUrl: string
  // Database config
  dbConfig: DBConfig & {
    /**
     * storageBucket
     * Extended field not in the base DBConfig union.
     * Used specifically by the Firebase adapter to specify the
     * Cloud Storage bucket (e.g. 'my-app.appspot.com').
     */
    storageBucket?: string
  }

  // Admin user
  adminUser: {
    fullName: string
    email:    string
    password: string
  }

  // Models
  models: any[]

  // Branding
  branding: {
    logoUrl:      string
    primaryColor: string
  }

  // Actions
  setInstallerValue: <T extends keyof InstallerState>(
    key:   T,
    value: InstallerState[T]
  ) => void

  resetInstaller: () => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * useInstallerStore
 *
 * The Zustand store hook for the installer wizard. Call this inside any
 * React component to read state or trigger actions.
 *
 * Reading a value (component re-renders only when that value changes):
 *   const projectName = useInstallerStore((state) => state.projectName)
 *
 * Calling an action:
 *   const set = useInstallerStore((state) => state.setInstallerValue)
 *   set('projectName', 'My New App')
 */
export const useInstallerStore = create<InstallerState>((set) => ({

  // ── Initial values ────────────────────────────────────────────────────────

  // Project basics
  projectName:         '',
  domain:              '',
  subdomain:           '',
  selectedProjectType: 'blank',   // No template — start from scratch
  selectedPages:       [],
  selectedStack:       'both',    // Generate both Next.js and Flutter code
  selectedDb:          null,      // No DB chosen yet
  installed:          true,
  // Features — all opt-in, disabled by default
  ecommerceEnabled:   false,
  demoContentEnabled: false,
  studioUrl: 'http://localhost:3000',
  // Database config — defaults to Supabase as a starting point.
  // The type and all connection fields will be replaced when the user
  // completes the database step of the wizard.
  dbConfig: {
    type:          'supabase',
    storageBucket: '',
  },

  // Admin user — all blank; filled in during the admin setup step
  adminUser: {
    fullName: '',
    email:    '',
    password: '',
  },

  // Models — empty until the user adds data model definitions
  models: [],

  // Branding — no logo, black as the default primary colour
  branding: {
    logoUrl:      '',
    primaryColor: '#000000',
  },

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * setInstallerValue
   *
   * Updates a single field in the store by key. Works for any field defined
   * in InstallerState.
   *
   * TypeScript safety:
   *   The generic <T extends keyof InstallerState> constraint means:
   *     - `key` must be an actual field name in InstallerState.
   *     - `value` must match the exact type of that field.
   *   Passing a mismatched type is caught at compile time, not at runtime.
   *
   * @param key   - The name of the InstallerState field to update.
   * @param value - The new value (must match the field's type).
   *
   * @example
   *   setInstallerValue('domain', 'acme.com')
   *   setInstallerValue('selectedStack', 'next')
   *   setInstallerValue('ecommerceEnabled', true)
   */
  setInstallerValue: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
    })),

  /**
   * resetInstaller
   *
   * Resets every field in the store back to its initial default value.
   *
   * When to call this:
   *   - The user explicitly cancels the installation wizard.
   *   - The user clicks "Start over" after a failed installation attempt.
   *   - The installer page unmounts and you want to ensure a clean state
   *     the next time it mounts.
   *
   * Note: unlike consoleStore's resetConsole, there is no special post-reset
   * override needed here — all defaults are exactly what a fresh wizard start
   * should look like.
   */
  resetInstaller: () =>
    set(() => ({
      projectName:         '',
      domain:              '',
      subdomain:           '',
      selectedProjectType: 'blank',
      selectedPages:       [],
      selectedStack:       'both',
      selectedDb:          null,
      ecommerceEnabled:    false,
      demoContentEnabled:  false,
      installed:           true,
      studioUrl: 'http://localhost:3000',
      dbConfig: {
        type:          'supabase',
        storageBucket: '',
      },
      adminUser: {
        fullName: '',
        email:    '',
        password: '',
      },
      models:   [],
      branding: {
        logoUrl:      '',
        primaryColor: '#000000',
      },
    })),
}))