//app/api/menus/handlers/handleUpdateMenu.ts
import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function handleUpdateMenu(req: NextRequest): Promise<NextResponse> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { menu_id, user_id, ...updates } = body

  if (!menu_id) return NextResponse.json({ success: false, error: 'errors.missingMenuId' }, { status: 400 })
  if (!user_id) return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allItems = await adapter.read!(dbConfig, 'nxf_menus')
  const item = (allItems ?? []).find((m: any) => resolveDocumentId(m) === menu_id)
  if (item?.is_system) {
    return NextResponse.json({ success: false, error: 'errors.systemItemProtected' }, { status: 403 })
  }

  // FIX: real PK is menu_id, not id — missing idColumn 5th arg meant this
  // always targeted a non-existent 'id' column.
  await adapter.update!(dbConfig, 'nxf_menus', menu_id, {
    ...updates,
    updated_at: new Date().toISOString(),
  }, 'menu_id')

  return NextResponse.json({ success: true })
}