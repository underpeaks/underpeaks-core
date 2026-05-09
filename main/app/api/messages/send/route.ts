import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { conversation_id, content } = await req.json()
    if (!conversation_id || !content)
      return NextResponse.json({ error: 'conversation_id and content are required' }, { status: 400 })

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null
    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    const db      = adapter.getFirestoreInstance?.()
    const now     = new Date().toISOString()
    const mes_id  = uuidv4()

    const message = {
      mes_id,
      conversation_id,
      sender_id:  uid,
      recipient_id: null,
      content,
      is_read:    false,
      sent_at:    now,
      created_at: now,
      updated_at: now,
    }

    await db.collection('nxf_messages').doc(mes_id).set(message)

    // Update conversation last_message_preview and last_message_at
    await db.collection('nxf_conversations').doc(conversation_id).update({
      last_message_preview: content.slice(0, 100),
      last_message_at:      now,
      updated_at:           now,
    })

    return NextResponse.json({ success: true, message })
  } catch (err: any) {
    console.error('[messages/send]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}