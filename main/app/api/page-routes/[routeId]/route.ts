// app/api/page-routes/[routeId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ routeId: string }> }
) {
  const { routeId } = await params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const data = {
    ...body,
    updated_at: new Date().toISOString(),
  }

  const updated = await adapter.update!(dbConfig, 'nxf_page_routes', routeId, data, 'route_id')

  return NextResponse.json({ success: true, route: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ routeId: string }> }
) {
  const { routeId } = await params

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  await adapter.delete!(dbConfig, 'nxf_page_routes', routeId)

  return NextResponse.json({ success: true })
}