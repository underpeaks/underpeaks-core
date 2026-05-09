import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function GET(req: NextRequest) {
  try {
    const { searchParams }  = new URL(req.url)
    const conversation_id   = searchParams.get('conversation_id')
    if (!conversation_id)
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 })

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
      .collection('nxf_messages')
      .where('conversation_id', '==', conversation_id)
      .orderBy('sent_at', 'asc')
      .get()

    const messages = snapshot?.docs.map((doc: any) => ({
      mes_id: doc.id,
      ...doc.data(),
    })) ?? []

    return NextResponse.json({ messages })
  } catch (err: any) {
    console.error('[messages/thread]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}