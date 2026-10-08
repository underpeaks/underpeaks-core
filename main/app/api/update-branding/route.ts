// app/api/settings/update-branding/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

// ---------------------------------------------------------------------------
// Helper: patch local config file
// ---------------------------------------------------------------------------

function patchConfigFile(logoUrl: string, faviconUrl: string) {
  const filePath = path.resolve(process.cwd(), 'underpeaks.config.json')
  if (!fs.existsSync(filePath)) return
  const config      = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.logoUrl    = logoUrl
  config.faviconUrl = faviconUrl
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

function parseJson(v: any): Record<string, any> {
  if (!v) return {}
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return {} }
  }
  return v
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

    const configId = existing?.config_id ?? existing?.id ?? existing?._id?.toString()

    if (!configId) {
      return NextResponse.json(
        { error: 'System config record not found for this user' },
        { status: 404 }
      )
    }

    // ── Update branding in database ─────────────────────────────────────────
    // Firestore: dot-notation updates only the nested branding fields.
    // Everything else (Postgres/MySQL/Supabase/Mongo): branding is a JSON
    // column, so merge into the existing object and write it back whole.

    const idColumn = existing.config_id ? 'config_id' : undefined
    const now      = new Date().toISOString()

    if (dbConfig.type === 'firebase') {
      await adapter.update(dbConfig, 'nxf_system_config', configId, {
        'branding.logo_url':    logo_url    ?? '',
        'branding.favicon_url': favicon_url ?? '',
        updated_at:             now,
      })
    } else {
      const current  = parseJson(existing.branding)
      const branding = { ...current, logo_url: logo_url ?? '', favicon_url: favicon_url ?? '' }
      const value    = dbConfig.type === 'postgres' || dbConfig.type === 'mysql'
        ? JSON.stringify(branding)
        : branding

      await adapter.update(dbConfig, 'nxf_system_config', configId, {
        branding:   value,
        updated_at: now,
      }, idColumn)
    }

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