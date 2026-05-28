import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import { NextRequest, NextResponse } from 'next/server'

export async function handleUpdatePage(req: NextRequest): Promise<NextResponse> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { page_id, user_id, ...updates } = body

  if (!page_id) return NextResponse.json({ success: false, error: 'errors.missingPageId' }, { status: 400 })
  if (!user_id) return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })

  if (updates.is_system === true) {
    return NextResponse.json({ success: false, error: 'errors.systemPageProtected' }, { status: 403 })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  await adapter.update!(dbConfig, 'nxf_pages', page_id, {
    ...updates,
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}