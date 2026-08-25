import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function handleDeleteMenu(req: NextRequest): Promise<NextResponse> {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { menu_id, user_id } = body

  if (!menu_id) return NextResponse.json({ success: false, error: 'errors.missingMenuId' }, { status: 400 })
  if (!user_id) return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allItems = await adapter.read!(dbConfig, 'nxf_menus')
  const item = (allItems ?? []).find((m: any) => resolveDocumentId(m) === menu_id)
  if (item?.is_system) {
    return NextResponse.json({ success: false, error: 'errors.systemItemProtected' }, { status: 403 })
  }

  // FIX: table name was 'nxf_menu' (missing the 's') on both delete calls
  // below — every delete was targeting a table that doesn't exist. Also
  // missing the idColumn 5th arg ('menu_id') that updateMenu.ts already
  // uses correctly — without it, adapters that require an explicit PK
  // column would target a non-existent 'id' column instead.

  // Delete any children of this item first
  const children = (allItems ?? []).filter((m: any) => m.parent_id === menu_id)
  for (const child of children) {
    await adapter.delete!(dbConfig, 'nxf_menus', resolveDocumentId(child), 'menu_id')
  }

  await adapter.delete!(dbConfig, 'nxf_menus', menu_id, 'menu_id')

  return NextResponse.json({ success: true })
}