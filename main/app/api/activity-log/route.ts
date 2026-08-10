/**
 * POST /api/activity-log
 *
 * Reusable activity logging endpoint. Writes one event to
 * nxf_system_activity_logs. Resolves project_id and tenant_id
 * server-side — callers only need to supply user_id + action.
 *
 * Body: { user_id, action, context? }
 *
 * Copy-paste usage from any page:
 *   await logActivity(userId, 'model_created', { model_name: 'Product' })
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function POST(req: NextRequest) {
  try {
    const { user_id, action, context = {} } = await req.json()

    if (!user_id || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_id, action' },
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
      user_id,
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
      { success: false, error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}