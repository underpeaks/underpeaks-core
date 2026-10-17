// app/api/cmsusers/presence/route.ts

/**
 * POST /api/cmsusers/presence
 *
 * Called on tab close (fetch with keepalive) to mark the signed-in user
 * offline. The user comes from the Bearer token — a user_id in the body is
 * ignored, so nobody can change another user's presence.
 * Only updates is_logged_in, nothing else.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    let body: any = {}
    try { body = await req.json() } catch { /* empty body is fine */ }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // Key on user_id — the nxf_users primary key on every adapter
    await adapter.update!(dbConfig, 'nxf_users', session.userId, {
      is_logged_in: body?.is_logged_in === true,
      updated_at:   new Date().toISOString(),
    }, 'user_id')

    return NextResponse.json({ success: true })

  } catch {
    // Silent — a failed presence update on tab close is not an error
    return NextResponse.json({ success: false }, { status: 500 })
  }
}