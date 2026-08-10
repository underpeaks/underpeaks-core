// app/api/settings/api-keys/revoke/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function POST(req: NextRequest) {
  try {
    // ── Validate body ───────────────────────────────────────────────────────

    const { api_id } = await req.json()

    if (!api_id) {
      return NextResponse.json({ error: 'api_id is required' }, { status: 400 })
    }

    // ── Auth ────────────────────────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    let uid: string | null = null

    if (adapter.supportsBuiltInAuth) {
      const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)
      uid = decoded?.uid ?? decoded?.user_id ?? null
    } else {
      const storedToken = await adapter.findTokenByAccessToken?.(token)
      uid = (storedToken && !storedToken.revoked) ? storedToken.user_id : null
    }

    if (!uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ── Resolve project_id server-side (IDOR protection) ───────────────────

    const projects   = await adapter.readAll!(dbConfig, 'nxf_system_projects')
    const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null

    if (!project_id) {
      return NextResponse.json({ error: 'Could not resolve project' }, { status: 500 })
    }

    // ── Revoke key ──────────────────────────────────────────────────────────

    if (!adapter.revokeApiKey) {
      throw new Error(`${dbType} adapter does not implement revokeApiKey`)
    }

    await adapter.revokeApiKey(dbConfig, api_id, project_id)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[api-keys/revoke] Error:', err.message)

    // Return 403 specifically for ownership violations
    const status = err.message === 'Forbidden' ? 403 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}