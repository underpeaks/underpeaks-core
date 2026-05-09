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

    const snapshot = await adapter.getFirestoreInstance?.()
      .collection('nxf_notifications')
      .where('recipient_user_id', '==', uid)
      .where('status', '!=', 'deleted')
      .orderBy('status')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()

    const notifications = snapshot?.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) ?? []

    return NextResponse.json({ notifications })
  } catch (err: any) {
    console.error('[notifications/list]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}