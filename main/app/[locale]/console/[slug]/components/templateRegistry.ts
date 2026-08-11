/**
 * templateRegistry.ts
 * Location: app/[locale]/console/[slug]/components/templateRegistry.ts
 *
 * Central registry mapping template IDs to their React components.
 * Routers and the page builder both read from this registry — no
 * hardcoded switch statements anywhere.
 *
 * Adding a new template:
 *   1. Build the template component in components/admin or components/preview
 *   2. Import it here
 *   3. Add an entry to TEMPLATE_REGISTRY
 *   4. Add the template id to nxf_pages.template_type union in types.ts
 *
 * That's it. Routers automatically pick it up.
 *
 * Locked templates (hosted-only) are marked with locked: true. The
 * registry still includes them so they can show in the picker UI with
 * a lock icon, but the renderer falls back to a "locked" placeholder.
 */

import type { ComponentType } from 'react'
import type { AdminTemplateProps, ClientTemplateProps } from '../types'

// ── Admin data templates ─────────────────────────────────────────────────
import ListTemplate      from './admin/ListTemplate'
import GridTemplate      from './admin/GridTemplate'
import GalleryTemplate   from './admin/GalleryTemplate'
import FormTemplate      from './admin/FormTemplate'
import DashboardTemplate from './admin/DashboardTemplate'
import DetailTemplate    from './admin/DetailTemplate'

// ── Preview-only templates (mockups) ─────────────────────────────────────
// import SplashTemplate         from './preview/SplashTemplate'
// import HomeTemplate           from './preview/HomeTemplate'
// import OnboardingTemplate     from './preview/OnboardingTemplate'
// import SignInTemplate         from './preview/SignInTemplate'
// import SignUpTemplate         from './preview/SignUpTemplate'
// import ForgotPasswordTemplate from './preview/ForgotPasswordTemplate'
// import ResetPasswordTemplate  from './preview/ResetPasswordTemplate'
// import LandingTemplate        from './preview/LandingTemplate'
// import BlogPostTemplate       from './preview/BlogPostTemplate'
// import ProfileTemplate        from './preview/ProfileTemplate'
// import CartTemplate           from './preview/CartTemplate'
// import ChatTemplate           from './preview/ChatTemplate'
// import MapTemplate            from './preview/MapTemplate'
// import CustomTemplate         from './preview/CustomTemplate'

// -------------------------------------------------------------------------
// Template categories
// -------------------------------------------------------------------------

/**
 * Determines which props the template expects and how it behaves.
 *
 *   - data      : Admin template that needs a model. Full CRUD.
 *                 Examples: list, grid, gallery, form, detail, dashboard.
 *
 *   - preview   : Static mockup template. Model is optional.
 *                 Examples: splash, home, sign_in, landing, cart, etc.
 *
 *   - hybrid    : Reserved for future. Could be a preview that wires up
 *                 a model at code-gen time but renders static in the CMS.
 */
export type TemplateCategory = 'data' | 'preview' | 'hybrid'

export interface TemplateRegistryEntry {
  id:           string
  name:         string
  category:     TemplateCategory
  component:    ComponentType<any>     // intentionally permissive — see notes below
  locked:       boolean                // true = hosted-only, renders LockedPlaceholder
  //fullScreenPreview?: boolean          // true = supports /preview/[slug] full-screen route
  //mobilePreview?:     boolean          // true = supports /preview/mobile/[slug] phone-frame route
  description?:       string
}

// -------------------------------------------------------------------------
// The registry
// -------------------------------------------------------------------------

export const TEMPLATE_REGISTRY: Record<string, TemplateRegistryEntry> = {

  // ── Admin data templates ───────────────────────────────────────────────
  list: {
    id:          'list',
    name:        'List View',
    category:    'data',
    component:   ListTemplate,
    locked:      false,
    description: 'Paginated table with search, filter, sort and full CRUD',
  },
  grid: {
    id:          'grid',
    name:        'Grid View',
    category:    'data',
    component:   GridTemplate,
    locked:      false,
    description: 'Card grid layout with full CRUD',
  },
  gallery: {
    id:          'gallery',
    name:        'Gallery',
    category:    'data',
    component:   GalleryTemplate,
    locked:      false,
    description: 'Image-focused gallery layout',
  },
  form: {
    id:          'form',
    name:        'Form',
    category:    'data',
    component:   FormTemplate,
    locked:      false,
    description: 'Single-record submission form',
  },
  detail: {
    id:          'detail',
    name:        'Detail View',
    category:    'data',
    component:   DetailTemplate,
    locked:      false,
    description: 'Single record detail view',
  },
  dashboard: {
    id:          'dashboard',
    name:        'Dashboard',
    category:    'data',
    component:   DashboardTemplate,
    locked:      false,
    description: 'KPI-focused overview with summary stats',
  },

  // ── Preview-only mockup templates ──────────────────────────────────────
  // splash: {
  //   id:                'splash',
  //   name:              'Splash Screen',
  //   category:          'preview',
  //   component:         SplashTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // home: {
  //   id:                'home',
  //   name:              'Home Screen',
  //   category:          'preview',
  //   component:         HomeTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // onboarding: {
  //   id:                'onboarding',
  //   name:              'Onboarding',
  //   category:          'preview',
  //   component:         OnboardingTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // sign_in: {
  //   id:                'sign_in',
  //   name:              'Sign In',
  //   category:          'preview',
  //   component:         SignInTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // sign_up: {
  //   id:                'sign_up',
  //   name:              'Sign Up',
  //   category:          'preview',
  //   component:         SignUpTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // forgot_password: {
  //   id:                'forgot_password',
  //   name:              'Forgot Password',
  //   category:          'preview',
  //   component:         ForgotPasswordTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // reset_password: {
  //   id:                'reset_password',
  //   name:              'Reset Password',
  //   category:          'preview',
  //   component:         ResetPasswordTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // landing: {
  //   id:                'landing',
  //   name:              'Landing',
  //   category:          'preview',
  //   component:         LandingTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // 'blog-post': {
  //   id:                'blog-post',
  //   name:              'Blog Post',
  //   category:          'preview',
  //   component:         BlogPostTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // profile: {
  //   id:                'profile',
  //   name:              'Profile',
  //   category:          'preview',
  //   component:         ProfileTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // cart: {
  //   id:                'cart',
  //   name:              'Cart',
  //   category:          'preview',
  //   component:         CartTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // chat: {
  //   id:                'chat',
  //   name:              'Chat',
  //   category:          'preview',
  //   component:         ChatTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // map: {
  //   id:                'map',
  //   name:              'Map',
  //   category:          'preview',
  //   component:         MapTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
  // custom: {
  //   id:                'custom',
  //   name:              'Custom',
  //   category:          'preview',
  //   component:         CustomTemplate,
  //   locked:            false,
  //   fullScreenPreview: true,
  //   mobilePreview:     true,
  // },
}

// -------------------------------------------------------------------------
// Helper functions
// -------------------------------------------------------------------------

/**
 * Looks up a template by its ID. Returns null if not found.
 */
export function getTemplate(templateId: string): TemplateRegistryEntry | null {
  return TEMPLATE_REGISTRY[templateId] ?? null
}

/**
 * Returns all templates of a given category, sorted by name.
 */
export function getTemplatesByCategory(category: TemplateCategory): TemplateRegistryEntry[] {
  return Object.values(TEMPLATE_REGISTRY)
    .filter((t) => t.category === category)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Returns all templates that support full-screen preview at /preview/[slug].
 */
// export function getFullScreenPreviewTemplates(): TemplateRegistryEntry[] {
//   return Object.values(TEMPLATE_REGISTRY).filter((t) => t.fullScreenPreview)
// }

// /**
//  * Returns all templates that support mobile phone-frame preview.
//  */
// export function getMobilePreviewTemplates(): TemplateRegistryEntry[] {
//   return Object.values(TEMPLATE_REGISTRY).filter((t) => t.mobilePreview)
// }

/**
 * Returns all template IDs as an array of strings.
 * Useful for building the TemplateType union or for validation.
 */
export function getAllTemplateIds(): string[] {
  return Object.keys(TEMPLATE_REGISTRY)
}

/**
 * Checks if a template ID is valid.
 */
export function isValidTemplateId(id: string): boolean {
  return id in TEMPLATE_REGISTRY
}

/**
 * Checks if a template requires a linked model.
 */
export function templateRequiresModel(templateId: string): boolean {
  const entry = getTemplate(templateId)
  return entry?.category === 'data'
}