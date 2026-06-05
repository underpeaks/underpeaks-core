/**
 * types.ts
 *
 * Shared types for the dynamic page system.
 * Used by ALL templates (admin, client, preview),
 * the DataDrawer, FieldRenderer,
 * the dynamic page routers (/console/[slug] and /[slug]),
 * and the preview routes.
 *
 * Location: app/[locale]/console/[slug]/types.ts
 */

// ---------------------------------------------------------------------------
// Model schema types
// (mirrors what /api-cms/models/[id] returns)
// ---------------------------------------------------------------------------

export interface OptionsSource {
  table:        string
  label_column: string
  value_column: string
}

export interface ModelColumn {
  name:            string
  type:            string
  nullable?:       boolean
  unique?:         boolean
  is_primary?:     boolean
  hidden?:         boolean
  ui_type?:        string
  foreign_key?:    { references: string; on_delete?: string }
  options_mode?:   'manual' | 'dynamic'
  options?:        string[]
  options_source?: OptionsSource
}

export interface ModelSchema {
  version:      string
  columns:      ModelColumn[]
  hooks:        unknown[]
  integrations: unknown[]
}

export interface ModelRecord {
  sm_id:      string
  name:       string
  project_id: string
  tenant_id:  string
  schema:     ModelSchema
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Page record type
// (mirrors nxf_pages table)
// ---------------------------------------------------------------------------

export type PageType       = 'admin' | 'client'
export type PageVisibility = 'public' | 'admin' | 'draft'

export type TemplateType   =
  // Admin data templates
  | 'list'   | 'grid'   | 'gallery' | 'form' | 'detail' | 'dashboard'
  // Preview-only templates (mockups)
  | 'splash' | 'home'   | 'onboarding'
  | 'sign_in' | 'sign_up' | 'forgot_password' | 'reset_password'
  | 'landing' | 'blog-post' | 'profile'
  | 'cart' | 'chat' | 'map' | 'custom'

export interface PageRecord {
  page_id:          string
  project_id:       string
  tenant_id:        string
  name:             string
  title?:           string
  slug:             string
  model_id?:        string
  template_type:    TemplateType
  page_type:        PageType
  visibility:       PageVisibility
  status:           string
  hidden:           boolean
  is_system:        boolean
  seo_title?:       string
  seo_description?: string
  created_at:       string
  updated_at:       string
}

// ---------------------------------------------------------------------------
// Data record — a row from any model table
// ---------------------------------------------------------------------------

export type DataRecord = Record<string, unknown>

// ---------------------------------------------------------------------------
// Pagination metadata
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  total: number
  page:  number
  limit: number
  pages: number
}

// ---------------------------------------------------------------------------
// Template props
// Passed to every template component by the router.
// ---------------------------------------------------------------------------

/**
 * AdminTemplateProps
 *
 * Used by all admin/console templates that need full CRUD access:
 *   - ListTemplate, GridTemplate, GalleryTemplate, FormTemplate,
 *     DetailTemplate, DashboardTemplate
 *
 * Rendered at /console/[slug] when page_type='admin'.
 */
export interface AdminTemplateProps {
  page:       PageRecord
  model:      ModelRecord
  projectId:  string
  tenantId:   string
  authToken:  string
}

/**
 * ClientTemplateProps
 *
 * Used by client-facing templates rendered at /[slug] (public route)
 * and by the preview-only templates (Splash, Home, Onboarding, etc.)
 * shown in the admin console as mockups.
 *
 * model is optional because preview-only templates (Splash, Home, Cart, etc.)
 * do not have an associated data model — they are static mockups.
 *
 * authToken is optional because public client pages with visibility='public'
 * can be accessed without authentication.
 */
export interface ClientTemplateProps {
  page:       PageRecord
  model?:     ModelRecord
  projectId:  string
  tenantId:   string
  authToken?: string
  isPreview?: boolean
}

// ---------------------------------------------------------------------------
// Drawer mode
// ---------------------------------------------------------------------------

export type DrawerMode = 'create' | 'edit' | 'view'

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

export interface Toast {
  message: string
  type:    'success' | 'error'
}

// ---------------------------------------------------------------------------
// Select option (for select / multi-select fields)
// ---------------------------------------------------------------------------

export interface SelectOption {
  label: string
  value: string
}