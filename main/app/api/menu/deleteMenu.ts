// app/api/menu/deleteMenu.ts
import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

export async function handleDeleteMenu(req: NextRequest): Promise<NextResponse> {
  // The caller comes from the Bearer token — a user_id in the body is ignored.
  const session = await requireSessionUser(req)
  if (!session.ok) return session.response

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { menu_id } = body

  if (!menu_id) return NextResponse.json({ success: false, error: 'errors.missingMenuId' }, { status: 400 })

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allItems = await adapter.read!(dbConfig, 'nxf_menus')
  const item = (allItems ?? []).find((m: any) => resolveDocumentId(m) === menu_id)
  if (item?.is_system) {
    return NextResponse.json({ success: false, error: 'errors.systemItemProtected' }, { status: 403 })
  }

  // Table is 'nxf_menus' and the real PK is 'menu_id' — the idColumn arg is
  // required, otherwise adapters target a non-existent 'id' column.

  // Delete any children of this item first
  const children = (allItems ?? []).filter((m: any) => m.parent_id === menu_id)
  for (const child of children) {
    await adapter.delete!(dbConfig, 'nxf_menus', resolveDocumentId(child), 'menu_id')
  }

  await adapter.delete!(dbConfig, 'nxf_menus', menu_id, 'menu_id')

  return NextResponse.json({ success: true })
}