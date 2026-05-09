import { create } from 'zustand'

// ─── The single user shape the session API returns for ALL db types ────────────
// Each DB adapter block in the session API is responsible for mapping to this shape.

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

export interface ConsoleBranding {
  logo_url?:     string
  favicon_url?:  string
  primary_color?: string
}

export interface SmtpConfig {
  enabled:         boolean
  verify_email:    boolean
  forgot_password: boolean
  host:            string
  port:            string
  from_address:    string
  username:        string
  encryption:      'TLS' | 'SSL' | 'None'
  // password is never stored in the store — only in Firestore encrypted + .env
}

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

// ─── State ────────────────────────────────────────────────────────────────────

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

const DEFAULT_LOGO        = '/images/logo/NXT_Flutter_logo.png'
const DEFAULT_PROJECT     = 'Default'

const defaults = {
  user:         null,
  checkingAuth: true,
  config:       null,
  logoUrl:      DEFAULT_LOGO,
  projectName:  DEFAULT_PROJECT,
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  ...defaults,

  setConsoleValue: (key, value) =>
    set((state) => ({ ...state, [key]: value })),

  loadConfig: (config) =>
    set({
      config,
      logoUrl:     config?.branding?.logo_url || DEFAULT_LOGO,
      projectName: config?.project_name       ?? DEFAULT_PROJECT,
      
    }),

  resetConsole: () => set({ ...defaults, checkingAuth: false }),
}))