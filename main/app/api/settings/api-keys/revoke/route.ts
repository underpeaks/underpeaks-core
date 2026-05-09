import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

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

    const now = new Date().toISOString()

 const db = await adapter.getFirestoreInstance?.()


const snapshot = await db
  .collection('nxf_system_apis')
  .doc(api_id)
  .get()

if (!snapshot.exists) {
  return NextResponse.json({ error: 'API key not found' }, { status: 404 })
}

await snapshot.ref.update({
  status: 'revoked',
  revoked_at: now,
  updated_at: now,
})
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[api-keys/revoke]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}