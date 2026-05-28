// app/api/messages/mark-all-read/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    if (!uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ── Mark all read ───────────────────────────────────────────────────────

    if (!adapter.markAllMessagesRead) {
      throw new Error(`${dbType} adapter does not implement markAllMessagesRead`)
    }

    await adapter.markAllMessagesRead(dbConfig, uid)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[messages/mark-all-read] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}