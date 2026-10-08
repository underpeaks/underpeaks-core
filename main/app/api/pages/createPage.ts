// app/api/pages/createPage.ts
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { NextRequest, NextResponse } from 'next/server'

export async function handleCreatePage(req: NextRequest): Promise<NextResponse> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const {
    user_id, title, slug, model, model_id, template_type,
    nav_settings,
    visibility, seo_title, seo_description,
  } = body

  if (!user_id) return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })
  if (!title)   return NextResponse.json({ success: false, error: 'errors.missingName' },   { status: 400 })
  if (!slug)    return NextResponse.json({ success: false, error: 'errors.missingSlug' },   { status: 400 })

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const project = adapter.findProjectByOwnerId
    ? await adapter.findProjectByOwnerId(dbConfig, user_id)
    : null

  if (!project) {
    return NextResponse.json({ success: false, error: 'errors.projectNotFound' }, { status: 400 })
  }

  const projectId = project.id || project.project_id

  // tenant_id: project first, then email lookup, then the single tenant row.
  let tenantId: string | undefined = project.tenant_id
  if (!tenantId && adapter.findTenantByUserEmail && body.user_email) {
    const tenant = await adapter.findTenantByUserEmail(dbConfig, body.user_email)
    tenantId = tenant?.id ?? tenant?.ten_id
  }
  if (!tenantId && adapter.read) {
    const tenants = await adapter.read(dbConfig, 'nxf_system_tenants')
    const first   = (tenants ?? [])[0]
    tenantId      = first?.ten_id ?? first?.id
  }
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'errors.tenantNotFound' }, { status: 400 })
  }

  const page_id = `page_${Date.now()}`
  const now     = new Date().toISOString()

  // The drawer sends model_id; older callers send model. Write both columns
  // (Update already writes model_id).
  const modelValue = model_id ?? model ?? null

  // nxf_pages has no user_id column — the real column is created_by.
  await adapter.create!(dbConfig, 'nxf_pages', {
    page_id,
    project_id:      projectId,
    tenant_id:       tenantId,
    created_by:      user_id,
    title:           title.trim(),
    slug:            slug.trim(),
    model:           modelValue,
    model_id:        modelValue,
    template_type:   template_type ?? 'list',
    nav_settings:    nav_settings ?? {
      mobile: { header: 'none', bottom: 'none' },
      web:    { header: 'none', footer: 'none' },
    },
    visibility:      visibility ?? 'public',
    page_type:       body.page_type ?? 'admin',
    is_system:       false,
    hidden:          false,
    seo_title:       seo_title ?? '',
    seo_description: seo_description ?? '',
    created_at:      now,
    updated_at:      now,
  })

  return NextResponse.json({ success: true, page_id })
}