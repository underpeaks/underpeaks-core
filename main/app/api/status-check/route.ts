// app/api/auth/status-check/route.ts

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      user_id:  string
      context?: {
        ip?:      string
        browser?: string
        os?:      string
        device?:  string
      }
    }

    const { user_id, context } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // ── Check user status via adapter ───────────────────────────────────────
    // checkUserStatus reads nxf_users by user_id — no project_id filter
    // because nxf_users has NO project_id field (self-hosted, flat collection)

    if (!adapter.checkUserStatus) {
      throw new Error(`${dbConfig.type} adapter does not implement checkUserStatus`)
    }

    const statusCheck = await adapter.checkUserStatus(dbConfig, user_id)

    if (!statusCheck.allowed) {
      return NextResponse.json(
        { allowed: false, reason: statusCheck.reason },
        { status: 403 }
      )
    }

    // ── Write login activity log via adapter ────────────────────────────────
    // writeActivityLog resolves project_id and tenant_id server-side

    if (adapter.writeActivityLog) {
      await adapter.writeActivityLog(dbConfig, {
        user_id,
        action:  'user_login',
        context: context ?? {},
      })
    }

    return NextResponse.json({
      allowed: true,
      role:    statusCheck.user?.role ?? null,
    })

  } catch (error: any) {
    console.error('[POST /api/auth/status-check]', error.message)
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    )
  }
}