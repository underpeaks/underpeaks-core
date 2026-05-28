import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import { NextRequest, NextResponse } from 'next/server'

export async function handleCreateMenu(req: NextRequest): Promise<NextResponse> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { user_id, page_id, label, icon, order, parent_id, target, visible } = body

  if (!user_id) return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })
  if (!label)   return NextResponse.json({ success: false, error: 'errors.missingLabel' },  { status: 400 })

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const project = adapter.findProjectByOwnerId
    ? await adapter.findProjectByOwnerId(dbConfig, user_id)
    : null

  if (!project) {
    return NextResponse.json({ success: false, error: 'errors.projectNotFound' }, { status: 400 })
  }

  const projectId = project.id || project.project_id

  const tenant   = adapter.findTenantByUserEmail
    ? await adapter.findTenantByUserEmail(dbConfig, body.user_email ?? '')
    : null
  const tenantId = tenant?.id ?? ''

  const menu_id = `menu_${Date.now()}`
  const now     = new Date().toISOString()

  await adapter.create!(dbConfig, 'nxf_menu', {
    menu_id,
    project_id: projectId,
    tenant_id:  tenantId,
    page_id:    page_id ?? null,
    label:      label.trim(),
    icon:       icon ?? 'FiFileText',
    order:      order ?? 0,
    parent_id:  parent_id ?? null,
    target:     target ?? '_self',
    visible:    visible ?? true,
    is_system:  false,
    created_at: now,
    updated_at: now,
  })

  return NextResponse.json({ success: true, menu_id })
}