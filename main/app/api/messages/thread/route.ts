import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function GET(req: NextRequest) {
  try {
    const conversation_id = req.nextUrl.searchParams.get('conversation_id')
    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 })
    }

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    let uid: string | null = null
    if (adapter.supportsBuiltInAuth) {
      const decoded = await adapter.validateBuiltInSession?.(dbConfig, token)
      uid = decoded?.uid ?? decoded?.user_id ?? null
    } else {
      const storedToken = await adapter.findTokenByAccessToken?.(token)
      uid = (storedToken && !storedToken.revoked) ? storedToken.user_id : null
    }
    if (!uid) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    if (!adapter.getConversationThread) {
      throw new Error(`${dbType} adapter does not implement getConversationThread`)
    }

    const messages = await adapter.getConversationThread(dbConfig, conversation_id)
    return NextResponse.json({ messages })

  } catch (err: any) {
    console.error('[messages/thread] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}