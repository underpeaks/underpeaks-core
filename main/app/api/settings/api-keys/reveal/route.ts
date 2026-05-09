import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'
import { decryptApiKey } from '@/app/lib/apiKeyEncryption'

export async function POST(req: NextRequest) {
  try {
    const { api_id } = await req.json()
    if (!api_id)
      return NextResponse.json({ error: 'api_id is required' }, { status: 400 })

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null
    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // ── Fetch the key doc ──────────────────────────────────────────────────
    const db  = adapter.getFirestoreInstance?.()
    const doc = await db.collection('nxf_system_apis').doc(api_id).get()

    if (!doc.exists)
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })

    const data = doc.data()

    if (data.status === 'revoked')
      return NextResponse.json({ error: 'Key has been revoked' }, { status: 400 })

    // ── Verify ownership via project_id ────────────────────────────────────
    const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
    const project_id = project?.id ?? project?.project_id ?? null

    if (data.project_id !== project_id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const plainKey = decryptApiKey(data.key_encrypted)

    return NextResponse.json({ success: true, key: plainKey })
  } catch (err: any) {
    console.error('[api-keys/reveal]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}