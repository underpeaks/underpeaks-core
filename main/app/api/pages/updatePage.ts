// app/api/pages/updatePage.ts
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'
import { NextRequest, NextResponse } from 'next/server'

export async function handleUpdatePage(req: NextRequest): Promise<NextResponse> {
  // The caller comes from the Bearer token — a user_id in the body is ignored.
  const session = await requireSessionUser(req)
  if (!session.ok) return session.response

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { page_id, user_id: _ignoredUserId, ...updates } = body

  if (!page_id) return NextResponse.json({ success: false, error: 'errors.missingPageId' }, { status: 400 })

  if (updates.is_system === true) {
    return NextResponse.json({ success: false, error: 'errors.systemPageProtected' }, { status: 403 })
  }

  // These can never be changed through an update.
  delete updates.id
  delete updates.page_id
  delete updates.project_id
  delete updates.tenant_id
  delete updates.created_by
  delete updates.is_system
  delete updates.created_at

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allPages = await adapter.readAll!(dbConfig, 'nxf_pages')
  const page = (allPages ?? []).find((p: any) => p.page_id === page_id)
  if (!page) {
    return NextResponse.json({ success: false, error: 'errors.pageNotFound' }, { status: 404 })
  }

  // Real PK is page_id, not id — the idColumn arg is required.
  // nav_settings flows through automatically since this spreads all `updates`
  // (no allow-list filtering here, unlike Studio's updatePage.ts).
  await adapter.update!(dbConfig, 'nxf_pages', page_id, {
    ...updates,
    updated_at: new Date().toISOString(),
  }, 'page_id')

  return NextResponse.json({ success: true })
}