// app/api/settings/api-keys/reveal/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { decryptApiKey }             from '@/app/lib/apiKeyEncryption'
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

    // ── Fetch key record ────────────────────────────────────────────────────

    if (!adapter.getApiKey) {
      throw new Error(`${dbType} adapter does not implement getApiKey`)
    }

    const keyRecord = await adapter.getApiKey(dbConfig, api_id)

    if (!keyRecord) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    // ── Revoke check ────────────────────────────────────────────────────────

    if (keyRecord.status === 'revoked') {
      return NextResponse.json({ error: 'Key has been revoked' }, { status: 400 })
    }

    // ── Ownership check (IDOR protection) ───────────────────────────────────
    // Resolve project_id server-side — never trust client-supplied values

    const projects   = await adapter.readAll!(dbConfig, 'nxf_system_projects')
    const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null

    if (!project_id || keyRecord.project_id !== project_id) {
      // Return 403 not 404 — key exists, caller just isn't allowed to access it
      // Don't reveal why — avoid leaking which api_ids exist
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // ── Decrypt and return ──────────────────────────────────────────────────
    // key_encrypted stays on the server — only plaintext is returned

    const plainKey = decryptApiKey(keyRecord.key_encrypted)

    return NextResponse.json({ success: true, key: plainKey })

  } catch (err: any) {
    console.error('[api-keys/reveal] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}