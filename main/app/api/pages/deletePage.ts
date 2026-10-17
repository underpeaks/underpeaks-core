// app/api/pages/deletePage.ts
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

export async function handleDeletePage(req: NextRequest): Promise<NextResponse> {
  // The caller comes from the Bearer token — a user_id in the body is ignored.
  const session = await requireSessionUser(req)
  if (!session.ok) return session.response

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { page_id } = body

  if (!page_id) return NextResponse.json({ success: false, error: 'errors.missingPageId' }, { status: 400 })

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allPages = await adapter.readAll!(dbConfig, 'nxf_pages')
  const page = (allPages ?? []).find((p: any) => p.page_id === page_id)
  if (!page) {
    return NextResponse.json({ success: false, error: 'errors.pageNotFound' }, { status: 404 })
  }
  if (page.is_system) {
    return NextResponse.json({ success: false, error: 'errors.systemPageProtected' }, { status: 403 })
  }

  // Real PK is page_id — the idColumn arg is required, otherwise it defaults
  // to 'id', which doesn't exist on nxf_pages.
  await adapter.delete!(dbConfig, 'nxf_pages', page_id, 'page_id')

  return NextResponse.json({ success: true })
}