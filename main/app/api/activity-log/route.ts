// app/api/activity-log/route.ts

/**
 * POST /api/activity-log
 *
 * Reusable activity logging endpoint. Writes one event to
 * nxf_system_activity_logs. Resolves project_id and tenant_id
 * server-side — callers only need to supply action (+ optional context).
 *
 * The user comes from the Bearer token. A user_id in the body is ignored,
 * so nobody can write log entries for another user.
 *
 * Body: { action, context? }   (user_id is accepted but ignored)
 *
 * Copy-paste usage from any page:
 *   await logActivity(userId, 'model_created', { model_name: 'Product' })
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

const MAX_ACTION_LENGTH  = 100
const MAX_CONTEXT_BYTES  = 5 * 1024

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const { action, context = {} } = await req.json()

    if (!action || typeof action !== 'string' || action.length > MAX_ACTION_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing action' },
        { status: 400 }
      )
    }

    if (
      context === null ||
      typeof context !== 'object' ||
      Buffer.byteLength(JSON.stringify(context)) > MAX_CONTEXT_BYTES
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid context' },
        { status: 400 }
      )
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // Resolve project_id and tenant_id server-side — never from the client
    const projects = await adapter.readAll!(dbConfig, 'nxf_system_projects')
    const tenants  = await adapter.readAll!(dbConfig, 'nxf_system_tenants')

    const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null
    const tenant_id  = tenants[0]?.ten_id      ?? tenants[0]?.id  ?? null

    if (!project_id || !tenant_id) {
      return NextResponse.json(
        { success: false, error: 'Could not resolve project_id or tenant_id' },
        { status: 500 }
      )
    }

    await adapter.create!(dbConfig, 'nxf_system_activity_logs', {
      sal_id:     crypto.randomUUID(),
      user_id:    session.userId,
      project_id,
      tenant_id,
      action,
      context,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[activity-log] Error:', err.message)
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}