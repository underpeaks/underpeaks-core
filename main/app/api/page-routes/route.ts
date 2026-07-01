// File: app/api/page-routes/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { withTenant }                from '@/app/lib/withTenant'
import crypto                        from 'crypto'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!
)

export async function GET(req: NextRequest) {
  const tenant = await withTenant(req)
  if (!tenant) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await serviceClient
    .from('nxf_page_routes')
    .select('*')
    .eq('project_id', tenant.project_id)
    .eq('tenant_id', tenant.tenant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ routes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const tenant = await withTenant(req)
  if (!tenant) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { from_page_id, to_page_id, trigger, label } = body

  if (!from_page_id || !to_page_id) {
    return NextResponse.json({ error: 'from_page_id and to_page_id are required' }, { status: 400 })
  }

  const { data, error } = await serviceClient
    .from('nxf_page_routes')
    .insert({
      route_id:     crypto.randomUUID(),
      project_id:   tenant.project_id,
      tenant_id:    tenant.tenant_id,
      from_page_id,
      to_page_id,
      trigger:      trigger ?? 'tap',
      label:        label ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ route: data }, { status: 201 })
}