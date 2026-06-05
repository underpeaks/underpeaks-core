/**
 * extensions/types.ts
 *
 * Type definitions for the NXTFlutter extension system.
 * No actual extensions are built in the self-hosted version — this file
 * exists so the architecture is locked in and future extensions snap on
 * cleanly without requiring structural changes.
 */

// ---------------------------------------------------------------------------
// Extension types
// ---------------------------------------------------------------------------

export type ExtensionType =
  | 'shipping'
  | 'payment'
  | 'notification'
  | 'field'
  | 'custom'

// ---------------------------------------------------------------------------
// Extension lifecycle hooks
// ---------------------------------------------------------------------------

export type ExtensionHookName =
  | 'record.created'
  | 'record.updated'
  | 'record.deleted'
  | 'cart.checkout'
  | 'order.created'
  | 'order.updated'

export interface ExtensionHookContext {
  model:      string
  record:     Record<string, unknown>
  user_id?:   string
  project_id: string
  tenant_id:  string
}

export interface ExtensionResult {
  success:  boolean
  data?:    Record<string, unknown>
  error?:   string
}

// ---------------------------------------------------------------------------
// Extension settings field
// ---------------------------------------------------------------------------

export interface ExtensionSettingsField {
  key:          string
  label:        string
  type:         'text' | 'password' | 'select' | 'toggle' | 'number'
  required?:    boolean
  options?:     string[]
  placeholder?: string
  hint?:        string
}

// ---------------------------------------------------------------------------
// Extension panel injection
// ---------------------------------------------------------------------------

export interface ExtensionPanel {
  location:  'drawer' | 'page' | 'settings'
  model?:    string
  component: string
}

// ---------------------------------------------------------------------------
// Main Extension interface
// ---------------------------------------------------------------------------

export interface Extension {
  id:          string
  name:        string
  version:     string
  description: string
  author:      string
  type:        ExtensionType
  hooks?:      Partial<Record<ExtensionHookName, (context: ExtensionHookContext) => Promise<ExtensionResult>>>
  panels?:     ExtensionPanel[]
  settings?:   ExtensionSettingsField[]
}

// ---------------------------------------------------------------------------
// Template pack — used by the marketplace (hosted version)
// ---------------------------------------------------------------------------

export interface TemplatePack {
  id:            string
  name:          string
  author:        string
  version:       string
  description:   string
  preview_url:   string
  thumbnail:     string
  models:        Record<string, unknown>[]
  pages:         Record<string, unknown>[]
  menu:          Record<string, unknown>[]
  demo_content?: Record<string, Record<string, unknown>[]>
}