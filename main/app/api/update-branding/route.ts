// app/api/settings/update-branding/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

// ---------------------------------------------------------------------------
// Helper: patch local config file
// ---------------------------------------------------------------------------

function patchConfigFile(logoUrl: string, faviconUrl: string) {
  const filePath = path.resolve(process.cwd(), 'nxt_flutter.config.json')
  if (!fs.existsSync(filePath)) return
  const config      = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.logoUrl    = logoUrl
  config.faviconUrl = faviconUrl
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // ── Validate body ───────────────────────────────────────────────────────

    const { user_id, logo_url, favicon_url } = await req.json()

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // ── Resolve adapter ─────────────────────────────────────────────────────

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    if (!adapter.findSystemConfigByUserId || !adapter.update) {
      throw new Error(`${dbConfig.type} adapter does not implement required methods`)
    }

    // ── Look up existing system config ──────────────────────────────────────

    const existing = await adapter.findSystemConfigByUserId(dbConfig, user_id)

    if (!existing?.id) {
      return NextResponse.json(
        { error: 'System config record not found for this user' },
        { status: 404 }
      )
    }

    // ── Update branding in database ─────────────────────────────────────────
    // Dot-notation keys update only the nested branding fields in Firestore
    // without overwriting the rest of the branding object

    await adapter.update(dbConfig, 'nxf_system_config', existing.id, {
      'branding.logo_url':    logo_url    ?? '',
      'branding.favicon_url': favicon_url ?? '',
      updated_at:             new Date().toISOString(),
    })

    // ── Patch local config file ─────────────────────────────────────────────

    patchConfigFile(logo_url ?? '', favicon_url ?? '')

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[update-branding] Error:', err.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}