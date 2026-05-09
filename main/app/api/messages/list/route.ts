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

    // Get project for this user
    const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
    const project_id = project?.id ?? project?.project_id ?? null

    if (!project_id)
      return NextResponse.json({ conversations: [] })

    // Fetch conversations for this project ordered by last_message_at
    const snapshot = await adapter.getFirestoreInstance?.()
      .collection('nxf_conversations')
      .where('project_id', '==', project_id)
      .orderBy('last_message_at', 'desc')
      .limit(10)
      .get()

    const conversations = snapshot?.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) ?? []

    // For each conversation get unread message count for this user
    const withUnread = await Promise.all(
      conversations.map(async (conv: any) => {
        const unreadSnap = await adapter.getFirestoreInstance?.()
          .collection('nxf_messages')
          .where('conversation_id', '==', conv.con_id ?? conv.id)
          .where('recipient_id', '==', uid)
          .where('is_read', '==', false)
          .get()

        return {
          ...conv,
          unread_count: unreadSnap?.size ?? 0,
        }
      })
    )

    return NextResponse.json({ conversations: withUnread })
  } catch (err: any) {
    console.error('[messages/list]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}