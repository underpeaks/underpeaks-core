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
    user_id, name, slug, model, template,
    visibility, seo_title, seo_description, is_system, hidden,
  } = body

  if (!user_id) return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })
  if (!name)    return NextResponse.json({ success: false, error: 'errors.missingName' },   { status: 400 })
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
  const tenant    = adapter.findTenantByUserEmail
    ? await adapter.findTenantByUserEmail(dbConfig, body.user_email ?? '')
    : null
  const tenantId  = tenant?.id ?? ''
  const page_id   = `page_${Date.now()}`
  const now       = new Date().toISOString()

  await adapter.create!(dbConfig, 'nxf_pages', {
  page_id,
  project_id:      projectId,
  tenant_id:       tenantId,
  user_id,
  name:            name.trim(),
  slug:            slug.trim(),
  model:           model ?? null,
  template:        template ?? 'list',
  visibility:      visibility ?? 'public',
  page_type:       body.page_type ?? 'admin',   // ← add this line
  is_system:       false,
  hidden:          false,
  seo_title:       seo_title ?? '',
  seo_description: seo_description ?? '',
  created_at:      now,
  updated_at:      now,
})

  return NextResponse.json({ success: true, page_id })
}