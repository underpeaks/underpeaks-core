// app/api/notifications/list/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function GET(req: NextRequest) {
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

    // ── Resolve project_id server-side ──────────────────────────────────────

    const projects   = await adapter.readAll!(dbConfig, 'nxf_system_projects')
    const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null

    if (!project_id) {
      return NextResponse.json(
        { error: 'Could not resolve project' },
        { status: 500 }
      )
    }

    // ── Fetch notifications ─────────────────────────────────────────────────

    if (!adapter.listNotifications) {
      throw new Error(`${dbType} adapter does not implement listNotifications`)
    }

    const notifications = await adapter.listNotifications(dbConfig, uid, project_id)

    return NextResponse.json({ notifications })

  } catch (err: any) {
    console.error('[notifications/list] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}