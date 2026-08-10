// app/api/notifications/mark-read/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function POST(req: NextRequest) {
  try {
    // ── Validate body ───────────────────────────────────────────────────────

    const { notification_id } = await req.json()

    if (!notification_id) {
      return NextResponse.json(
        { error: 'notification_id is required' },
        { status: 400 }
      )
    }

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

    // ── Mark notification read ──────────────────────────────────────────────

    if (!adapter.markNotificationRead) {
      throw new Error(`${dbType} adapter does not implement markNotificationRead`)
    }

    await adapter.markNotificationRead(dbConfig, notification_id, uid)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[notifications/mark-read] Error:', err.message)

    // Return 403 specifically for ownership violations
    const status = err.message.startsWith('Forbidden') ? 403 : 500
    return NextResponse.json({ error: err.message }, { status })
  }
}