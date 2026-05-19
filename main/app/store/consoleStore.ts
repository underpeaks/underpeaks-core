/**
 * consoleStore.ts
 *
 * The global client-side state store for the NXF console application.
 *
 * What is Zustand?
 *   Zustand is a lightweight state management library for React. Think of it
 *   as a simpler alternative to Redux. It stores data in a "store" object
 *   that any component in the app can read from or write to — without prop
 *   drilling and without wrapping the app in a Provider component.
 *
 *   You access the store by calling the exported hook:
 *     const user = useConsoleStore((state) => state.user)
 *     const loadConfig = useConsoleStore((state) => state.loadConfig)
 *
 * What this store holds:
 *   - The currently authenticated user (NXFUser).
 *   - Whether the auth check is still in progress (checkingAuth).
 *   - The system-wide configuration object loaded from the server (SystemConfig).
 *   - Derived display values: the logo URL and project name shown in the UI.
 *
 * Type definitions exported (so other files can import them):
 *   NXFUser        — the shape of a logged-in user returned by the session API.
 *   ConsoleBranding — branding overrides (logo, favicon, primary colour).
 *   SmtpConfig     — email sending configuration.
 *   SystemConfig   — the full system configuration object.
 *   ConsoleState   — the complete shape of this Zustand store.
 *
 * Actions (functions inside the store):
 *   setConsoleValue  — generic single-key setter for any state field.
 *   loadConfig       — applies a full SystemConfig and extracts display values.
 *   resetConsole     — resets all state back to defaults (used on logout).
 */

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * NXFUser
 *
 * Represents a fully authenticated and profiled user of the NXF console.
 * This is the single user shape that the session API returns regardless of
 * which database adapter is active (Firebase, Supabase, MongoDB, etc.).
 * Each database adapter is responsible for mapping its own user record into
 * this shape before returning it.
 *
 * Fields are split into two logical groups:
 *
 *  Auth identity — the identifier used by the authentication system:
 *    uid    — the unique ID assigned by the auth provider (e.g. Firebase UID).
 *    email  — the email address the user authenticated with.
 *
 *  Profile — additional data stored in the nxf_users table/collection:
 *    user_id        — the primary key in the nxf_users table (may differ from uid).
 *    user_email     — the email stored in the profile (may differ from auth email).
 *    full_name      — the user's display name.
 *    role           — the user's permission role (e.g. 'admin', 'editor', 'viewer').
 *    status         — account status (e.g. 'active', 'suspended').
 *    avatar_url     — URL to the user's profile picture, or null if not set.
 *    email_verified — whether the user has verified their email address.
 *    created_at     — ISO timestamp of when the account was created, or null.
 */
export interface NXFUser {
  // Auth identity
  uid:   string
  email: string

  // Profile from nxf_users table
  user_id:        string
  user_email:     string
  full_name:      string
  role:           string
  status:         string
  avatar_url:     string | null
  email_verified: boolean
  created_at:     string | null
}

/**
 * ConsoleBranding
 *
 * Optional branding overrides that replace the default NXF console visuals
 * with a customer's own brand identity. All fields are optional — if a field
 * is not set, the UI falls back to the default NXF asset.
 *
 * @property logo_url      - URL to the logo image shown in the sidebar/header.
 * @property favicon_url   - URL to the favicon shown in the browser tab.
 * @property primary_color - Hex colour string for the primary UI accent colour
 *                           (e.g. '#3B82F6'). Used for buttons, links, etc.
 */
export interface ConsoleBranding {
  logo_url?:      string
  favicon_url?:   string
  primary_color?: string
}

/**
 * SmtpConfig
 *
 * Configuration for the outgoing email (SMTP) service used to send
 * verification emails and password-reset emails.
 *
 * Security note:
 *   The SMTP password is intentionally NOT included in this interface.
 *   It is stored encrypted in the database and separately in an environment
 *   variable. It is never loaded into client-side state.
 *
 * @property enabled          - Whether the custom SMTP server is active. If
 *                              false, the system falls back to its default
 *                              email provider.
 * @property verify_email     - Whether to send email verification messages to
 *                              new users.
 * @property forgot_password  - Whether to send password-reset emails.
 * @property host             - Hostname of the SMTP server (e.g. 'smtp.sendgrid.net').
 * @property port             - Port number as a string (e.g. '587', '465').
 * @property from_address     - The "From" email address shown to recipients.
 * @property username         - SMTP authentication username.
 * @property encryption       - The encryption protocol used by the SMTP server.
 *                              'TLS' (STARTTLS, port 587), 'SSL' (port 465),
 *                              or 'None' (plain, port 25 — not recommended).
 */
export interface SmtpConfig {
  enabled:         boolean
  verify_email:    boolean
  forgot_password: boolean
  host:            string
  port:            string
  from_address:    string
  username:        string
  encryption:      'TLS' | 'SSL' | 'None'
}

/**
 * SystemConfig
 *
 * The top-level configuration object for the NXF console, loaded from the
 * server on application start. All fields are optional because the config
 * may be partially set during initial setup.
 *
 * @property project_name    - Human-readable name of this deployment
 *                             (e.g. 'Acme Corp Admin').
 * @property project_url     - The public URL of the project (e.g. 'https://acme.com').
 * @property db_type         - Which database adapter is active ('firebase',
 *                             'supabase', 'mongodb', 'mysql', 'postgres').
 * @property environment     - Deployment environment label ('development',
 *                             'staging', 'production').
 * @property deployment_type - How the app is hosted (e.g. 'vercel', 'docker').
 * @property nxf_api_key     - The NXF platform API key for this installation.
 * @property smtp            - SMTP email configuration (see SmtpConfig).
 * @property branding        - Visual branding overrides (see ConsoleBranding).
 */
export interface SystemConfig {
  project_name?:    string
  project_url?:     string
  db_type?:         string
  environment?:     string
  deployment_type?: string
  nxf_api_key?:     string
  smtp?:            SmtpConfig
  branding?:        ConsoleBranding
}

// ---------------------------------------------------------------------------
// Store state type
// ---------------------------------------------------------------------------

/**
 * ConsoleState
 *
 * The complete shape of the Zustand store — both the data fields (state)
 * and the action functions (methods that update state).
 *
 * Data fields:
 *   user         — The logged-in user, or null if not authenticated.
 *   checkingAuth — True while the initial auth/session check is running.
 *                  Components should render a loading state instead of
 *                  protected content while this is true, to avoid a flash
 *                  of the unauthenticated UI.
 *   config       — The full SystemConfig object, or null before it loads.
 *   logoUrl      — The resolved logo URL to display (branding override or
 *                  the default NXF logo).
 *   projectName  — The resolved project name to display (from config or
 *                  the default 'Default').
 *
 * Action functions:
 *   setConsoleValue  — Generic setter for any single key in the store.
 *   loadConfig       — Applies a full SystemConfig and derives display values.
 *   resetConsole     — Resets everything to defaults (called on logout).
 */
export type ConsoleState = {
  user:         NXFUser | null
  checkingAuth: boolean
  config:       SystemConfig | null
  logoUrl:      string
  projectName:  string

  setConsoleValue: <T extends keyof ConsoleState>(key: T, value: ConsoleState[T]) => void
  loadConfig:      (config: SystemConfig) => void
  resetConsole:    () => void
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * DEFAULT_LOGO
 *
 * The fallback logo path used when no branding override is configured.
 * This path is relative to the /public directory in Next.js.
 */
const DEFAULT_LOGO = '/images/logo/NXT_Flutter_logo.png'

/**
 * DEFAULT_PROJECT
 *
 * The fallback project name used when no project_name is set in SystemConfig.
 */
const DEFAULT_PROJECT = 'Default'

/**
 * defaults
 *
 * A plain object containing the initial values for all data fields in the
 * store. Extracted as a named constant so it can be reused in resetConsole()
 * without duplicating the values.
 */
const defaults = {
  user:         null,
  checkingAuth: true,
  config:       null,
  logoUrl:      DEFAULT_LOGO,
  projectName:  DEFAULT_PROJECT,
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * useConsoleStore
 *
 * The Zustand store hook. Call this inside any React component to read state
 * or call actions.
 *
 * Reading a single value (component only re-renders when that value changes):
 *   const user = useConsoleStore((state) => state.user)
 *
 * Reading multiple values:
 *   const { user, projectName } = useConsoleStore((state) => ({
 *     user:        state.user,
 *     projectName: state.projectName,
 *   }))
 *
 * Calling an action:
 *   const loadConfig = useConsoleStore((state) => state.loadConfig)
 *   loadConfig(myConfig)
 */
export const useConsoleStore = create<ConsoleState>((set) => ({
  // Spread the default values to initialise all data fields.
  ...defaults,

  // -------------------------------------------------------------------------

  /**
   * setConsoleValue
   *
   * A generic setter that updates any single field in the store by key.
   * This avoids writing a dedicated setter function for every field.
   *
   * TypeScript safety: the generic constraint <T extends keyof ConsoleState>
   * ensures that `key` must be a real field name and `value` must match the
   * type of that field. Passing a wrong type is a compile-time error.
   *
   * @param key   - The name of the ConsoleState field to update.
   * @param value - The new value for that field (must match its type).
   *
   * @example
   *   setConsoleValue('checkingAuth', false)
   *   setConsoleValue('user', myUser)
   */
  setConsoleValue: (key, value) =>
    set((state) => ({ ...state, [key]: value })),

  // -------------------------------------------------------------------------

  /**
   * loadConfig
   *
   * Applies a full SystemConfig object to the store and derives the two
   * display values (logoUrl and projectName) from it.
   *
   * Why derive logoUrl and projectName separately?
   *   Components that only show the logo or project name should not have to
   *   dig into the nested config object on every render. Having them as flat
   *   top-level fields makes selectors simpler and components cleaner.
   *
   * Fallback logic:
   *   logoUrl     — uses branding.logo_url if present, otherwise DEFAULT_LOGO.
   *   projectName — uses project_name if present, otherwise DEFAULT_PROJECT.
   *
   * @param {SystemConfig} config - The configuration object returned by the
   *                                server's config endpoint.
   *
   * @example
   *   const loadConfig = useConsoleStore((state) => state.loadConfig)
   *   loadConfig(await fetchSystemConfig())
   */
  loadConfig: (config) =>
    set({
      config,
      logoUrl:     config?.branding?.logo_url || DEFAULT_LOGO,
      projectName: config?.project_name       ?? DEFAULT_PROJECT,
    }),

  // -------------------------------------------------------------------------

  /**
   * resetConsole
   *
   * Resets the entire store back to its initial default values.
   * Called during logout to ensure no user data or config lingers in memory
   * after the session ends.
   *
   * Note: checkingAuth is explicitly set to false (overriding the default of
   * true) because after a logout we already know there is no session — there
   * is no need to show a loading state again.
   *
   * @example
   *   const resetConsole = useConsoleStore((state) => state.resetConsole)
   *   resetConsole() // called inside the logout handler
   */
  resetConsole: () => set({ ...defaults, checkingAuth: false }),
}))