/**
 * POST /api/cmsusers/presence
 *
 * Called by sendBeacon on beforeunload to mark a user offline.
 * Intentionally unauthenticated — beforeunload cannot send auth headers.
 * Only updates is_logged_in, nothing else.
 */

import { NextRequest, NextResponse } from 'next/server'
import { NxfUser }                   from '@/app/[locale]/console/types/users'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function POST(req: NextRequest) {
  try {
    const { user_id, is_logged_in } = await req.json()
    if (!user_id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const allUsers = await adapter.readAll!(dbConfig, 'nxf_users') as NxfUser[]
    const user     = allUsers.find((u) => u.user_id === user_id)

    if (!user) {
      return NextResponse.json({ success: false }, { status: 404 })
    }

    // Use doc.id (Firestore auto-ID) per the project pattern
    const docId = (user as any).id ?? user.user_id

    await adapter.update!(dbConfig, 'nxf_users', docId, {
      is_logged_in: is_logged_in ?? false,
      updated_at:   new Date().toISOString(),
    })

    return NextResponse.json({ success: true })

  } catch {
    // Silent — a failed presence update on tab close is not an error
    return NextResponse.json({ success: false }, { status: 500 })
  }
}