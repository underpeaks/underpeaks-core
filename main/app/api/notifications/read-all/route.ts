import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function POST(req: NextRequest) {
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

    const db       = adapter.getFirestoreInstance?.()
    const snapshot = await db
      .collection('nxf_notifications')
      .where('recipient_user_id', '==', uid)
      .where('status', '==', 'unread')
      .get()

    const batch = db.batch()
    snapshot?.docs.forEach((doc: any) => {
      batch.update(doc.ref, {
        status:  'read',
        read_at: new Date().toISOString(),
      })
    })
    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[notifications/mark-all-read]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}