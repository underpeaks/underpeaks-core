import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'
import { encryptApiKey } from '@/app/lib/apiKeyEncryption'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name?.trim())
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 })

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null
    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
    const project_id = project?.id ?? project?.project_id ?? null
    if (!project_id)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // ── Generate + encrypt key ─────────────────────────────────────────────
    const rawKey       = `nxt_live_${crypto.randomBytes(16).toString('hex')}`
    const prefix       = rawKey.slice(0, 16)
    const keyEncrypted = encryptApiKey(rawKey)
    const api_id       = uuidv4()
    const now          = new Date().toISOString()

    await adapter.create!(adapter.config, 'nxf_system_apis', {
      api_id,
      project_id,
      name:          name.trim(),
      key_encrypted: keyEncrypted,
      key_prefix:    prefix,
      status:        'active',
      last_used_at:  null,
      revoked_at:    null,
      created_at:    now,
      updated_at:    now,
    })

    return NextResponse.json({
      success: true,
      api_id,
      name:    name.trim(),
      prefix,
      // Don't return rawKey here — client fetches it via /reveal
    })
  } catch (err: any) {
    console.error('[api-keys/generate]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}