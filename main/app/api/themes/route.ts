/**
 * /app/api/themes/route.ts
 *
 * GET  /api/themes?user_id=xxx  — fetch theme for the user's project
 * POST /api/themes              — save theme for the user's project
 *
 * If no theme exists for the project, GET returns the default Underpeaks theme.
 * POST creates or overwrites the theme document.
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Default theme — Underpeaks brand defaults
// ---------------------------------------------------------------------------

export const DEFAULT_THEME = {
  colours: {
    primary:       '#0A0A0A',
    'primary-fg':  '#FFFFFF',
    secondary:     '#404040',
    'secondary-fg':'#FFFFFF',
    accent:        '#6366F1',
    background:    '#F9FAFB',
    surface:       '#FFFFFF',
    border:        '#E5E7EB',
    success:       '#22C55E',
    warning:       '#F59E0B',
    danger:        '#EF4444',
    text:          '#111827',
    'text-muted':  '#6B7280',
  },
  typography: {
    headingFont:   'Inter',
    bodyFont:      'Inter',
    monoFont:      'JetBrains Mono',
    headingWeight: '700',
    bodyWeight:    '400',
    scale:         'default',
  },
  spacing: {
    radius:  'md',
    density: 'default',
    shadow:  'sm',
  },
  flags: {
    // Appearance
    'dark-mode':          false,
    'system-theme':       false,
    // Localisation
    'multi-language':     false,
    'rtl-support':        false,
    // App Behaviour
    'offline-mode':       false,
    'push-notifications': false,
    'splash-screen':      false,
    'onboarding':         false,
    // Auth — paid
    '2fa':                false,
    'biometric':          false,
    'social-login':       false,
    'magic-link':         false,
    'sso':                false,
    // Advanced — paid
    'analytics':          false,
    'ab-testing':         false,
    'feature-gating':     false,
    // Code generation
    'flutter-state':      'riverpod',
    'nextjs-router':      'app-router',
  },
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function resolveDocumentId(doc: any): string {
  return doc.id || doc.theme_id
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const project = adapter.findProjectByOwnerId
      ? await adapter.findProjectByOwnerId(dbConfig, userId)
      : null

    if (!project) {
      return NextResponse.json({ success: true, theme: DEFAULT_THEME, isDefault: true })
    }

    const projectId = project.id || project.project_id
    const allThemes = await adapter.read!(dbConfig, 'nxf_themes')
    const theme     = (allThemes ?? []).find((t: any) => t.project_id === projectId)

    if (!theme) {
      return NextResponse.json({ success: true, theme: DEFAULT_THEME, isDefault: true })
    }

    return NextResponse.json({
      success:   true,
      theme_id:  resolveDocumentId(theme),
      theme: {
        colours:    theme.colours    ?? DEFAULT_THEME.colours,
        typography: theme.typography ?? DEFAULT_THEME.typography,
        spacing:    theme.spacing    ?? DEFAULT_THEME.spacing,
        flags:      theme.flags      ?? DEFAULT_THEME.flags,
      },
      isDefault: false,
    })
  } catch (err: any) {
    console.error('[GET /api/themes]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — create or overwrite
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
    }

    const { user_id, theme_id, colours, typography, spacing, flags } = body

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const project = adapter.findProjectByOwnerId
      ? await adapter.findProjectByOwnerId(dbConfig, user_id)
      : null

    if (!project) {
      return NextResponse.json({ success: false, error: 'errors.projectNotFound' }, { status: 400 })
    }

    const projectId = project.id || project.project_id
    const tenant    = adapter.findTenantByUserEmail
      ? await adapter.findTenantByUserEmail(dbConfig, body.user_email ?? '')
      : null
    const tenantId  = tenant?.id ?? ''
    const now       = new Date().toISOString()

    if (theme_id) {
      // Update existing
      await adapter.update!(dbConfig, 'nxf_themes', theme_id, {
        colours:    colours    ?? DEFAULT_THEME.colours,
        typography: typography ?? DEFAULT_THEME.typography,
        spacing:    spacing    ?? DEFAULT_THEME.spacing,
        flags:      flags      ?? DEFAULT_THEME.flags,
        updated_at: now,
      })
    } else {
      // Create new
      await adapter.create!(dbConfig, 'nxf_themes', {
        theme_id:   `theme_${Date.now()}`,
        project_id: projectId,
        tenant_id:  tenantId,
        colours:    colours    ?? DEFAULT_THEME.colours,
        typography: typography ?? DEFAULT_THEME.typography,
        spacing:    spacing    ?? DEFAULT_THEME.spacing,
        flags:      flags      ?? DEFAULT_THEME.flags,
        created_at: now,
        updated_at: now,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[POST /api/themes]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}