import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function DELETE(req: NextRequest) {
  try {
    const { conversation_id } = await req.json()
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

    const db = adapter.getFirestoreInstance?.()

    // Delete all messages in conversation
    const msgSnap = await db
      .collection('nxf_messages')
      .where('conversation_id', '==', conversation_id)
      .get()

    const batch = db.batch()
    msgSnap?.docs.forEach((doc: any) => batch.delete(doc.ref))

    // Delete conversation
    batch.delete(db.collection('nxf_conversations').doc(conversation_id))
    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[messages/delete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}