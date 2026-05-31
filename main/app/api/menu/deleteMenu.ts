import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

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

  // Delete any children of this item first
  const children = (allItems ?? []).filter((m: any) => m.parent_id === menu_id)
  for (const child of children) {
    await adapter.delete!(dbConfig, 'nxf_menu', resolveDocumentId(child))
  }

  await adapter.delete!(dbConfig, 'nxf_menu', menu_id)

  return NextResponse.json({ success: true })
}