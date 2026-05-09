import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function POST(req: NextRequest) {
  try {
    const { notification_id } = await req.json()
    if (!notification_id)
      return NextResponse.json({ error: 'notification_id is required' }, { status: 400 })

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null
    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    await adapter.getFirestoreInstance?.()
      .collection('nxf_notifications')
      .doc(notification_id)
      .update({
        status:  'read',
        read_at: new Date().toISOString(),
      })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[notifications/mark-read]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}