//app/api/pages/handlers/deletePage.ts
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function handleDeletePage(req: NextRequest): Promise<NextResponse> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { page_id, user_id } = body

  if (!page_id) return NextResponse.json({ success: false, error: 'errors.missingPageId' }, { status: 400 })
  if (!user_id) return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allPages = await adapter.readAll!(dbConfig, 'nxf_pages')
  const page = (allPages ?? []).find((p: any) => p.page_id === page_id)
  if (page?.is_system) {
    return NextResponse.json({ success: false, error: 'errors.systemPageProtected' }, { status: 403 })
  }

  // FIX: idColumn arg was missing entirely (trailing comma, nothing after) —
  // defaulted to 'id' which doesn't exist on nxf_pages. Real PK is page_id.
  await adapter.delete!(dbConfig, 'nxf_pages', page_id, 'page_id')

  return NextResponse.json({ success: true })
}