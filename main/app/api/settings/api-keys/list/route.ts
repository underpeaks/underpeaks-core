import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function GET(req: NextRequest) {
  try {
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
      return NextResponse.json({ keys: [] })

    const db       = adapter.getFirestoreInstance?.()
    const snapshot = await db
      .collection('nxf_system_apis')
      .where('project_id', '==', project_id)
      .where('status', '==', 'active')
      .orderBy('created_at', 'desc')
      .get()

    const keys = snapshot?.docs.map((doc: any) => {
      const data = doc.data()
      return {
        api_id:       doc.id,
        name:         data.name,
        key_prefix:   data.key_prefix,
        status:       data.status,
        last_used_at: data.last_used_at ?? null,
        created_at:   data.created_at,
      }
      // key_encrypted intentionally excluded
    }) ?? []

    return NextResponse.json({ keys })
  } catch (err: any) {
    console.error('[api-keys/list]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}