// app/api/page-routes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'

export async function GET(req: NextRequest) {
  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  // Single-project install — resolve project from first row, never by owner.
  const allProjects = await adapter.readAll!(dbConfig, 'nxf_system_projects')
  const project     = (allProjects ?? [])[0]
  if (!project) {
    return NextResponse.json({ routes: [] })
  }
  const projectId = project.project_id ?? project.id

  const allRoutes = await adapter.readAll!(dbConfig, 'nxf_page_routes')
  const routes = (allRoutes ?? []).filter((r: any) => r.project_id === projectId)

  return NextResponse.json({ routes })
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { from_page_id, to_page_id, trigger, label } = body

  if (!from_page_id || !to_page_id) {
    return NextResponse.json(
      { error: 'from_page_id and to_page_id are required' },
      { status: 400 }
    )
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allProjects = await adapter.readAll!(dbConfig, 'nxf_system_projects')
  const project     = (allProjects ?? [])[0]
  if (!project) {
    return NextResponse.json({ error: 'No project found' }, { status: 400 })
  }
  const projectId = project.project_id ?? project.id
  const tenantId  = project.tenant_id ?? ''

  const route = {
    route_id:   `route_${Date.now()}`,
    project_id: projectId,
    tenant_id:  tenantId,
    from_page_id,
    to_page_id,
    trigger:    trigger ?? 'tap',
    label:      label ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await adapter.create!(dbConfig, 'nxf_page_routes', route)

  return NextResponse.json({ route }, { status: 201 })
}