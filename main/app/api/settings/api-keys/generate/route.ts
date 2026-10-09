// app/api/settings/api-keys/generate/route.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { encryptApiKey }             from '@/app/lib/apiKeyEncryption'
import { v4 as uuidv4 }              from 'uuid'
import crypto                        from 'crypto'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

async function resolveUid(req: NextRequest, adapter: ReturnType<typeof getConfiguredAdapter>): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  const token      = authHeader?.replace('Bearer ', '') ?? null
  if (!token) return null

  const dbConfig = adapter.config
  const dbType   = dbConfig.type

  if (dbType === 'supabase' || dbType === 'firebase') {
    const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)
    return decoded?.uid ?? decoded?.user_id ?? decoded?.id ?? null
  }

  if (!adapter.findTokenByAccessToken) return null
  const storedToken = await adapter.findTokenByAccessToken(token)
  if (!storedToken) return null
  if (storedToken.revoked) return null
  if (new Date(storedToken.expires_at).getTime() < Date.now()) return null
  return storedToken.user_id
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json()
    if (!name?.trim())
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 })

    const adapter = getConfiguredAdapter()
    const uid     = await resolveUid(req, adapter)
    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const project = await adapter.findProjectByOwnerId?.(adapter.config, uid)

    // Same resolution order as list / reveal / revoke, so a key created here
    // is always visible to them (project_id first, document id as fallback).
    const project_id = project?.project_id ?? project?.id ?? null
    if (!project_id)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // tenant_id is NOT NULL on nxf_system_apis. SQL adapters carry it on the
    // project row; Firebase project documents do not, so fall back to the
    // installation's tenant record (nxf_system_tenants), the same way the
    // demo-content install and messages do.
    let tenant_id: string | null = project?.tenant_id ?? null

    if (!tenant_id && adapter.readAll) {
      const tenants = await adapter.readAll(adapter.config, 'nxf_system_tenants') as Record<string, any>[]
      tenant_id = tenants?.[0]?.ten_id ?? tenants?.[0]?.id ?? null
    }

    if (!tenant_id)
      return NextResponse.json({ error: 'Tenant not found for project' }, { status: 404 })

    const rawKey = `nxt_live_${crypto.randomBytes(16).toString('hex')}`
    const prefix = rawKey.slice(0, 16)
    const keyEncrypted = encryptApiKey(rawKey)

    const api_id = uuidv4()
    const now    = new Date().toISOString()

    await adapter.create!(adapter.config, 'nxf_system_apis', {
      api_id,
      project_id,
      tenant_id,
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
      name:   name.trim(),
      prefix,
    })

  } catch (err: any) {
    console.error('[api-keys/generate] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}