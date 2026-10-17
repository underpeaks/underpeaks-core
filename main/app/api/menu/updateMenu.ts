// app/api/menu/updateMenu.ts
import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

export async function handleUpdateMenu(req: NextRequest): Promise<NextResponse> {
  // The caller comes from the Bearer token — a user_id in the body is ignored.
  const session = await requireSessionUser(req)
  if (!session.ok) return session.response

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'errors.invalidBody' }, { status: 400 })
  }

  const { menu_id, user_id: _ignoredUserId, ...updates } = body

  if (!menu_id) return NextResponse.json({ success: false, error: 'errors.missingMenuId' }, { status: 400 })

  // These can never be changed through an update.
  delete updates.id
  delete updates.menu_id
  delete updates.project_id
  delete updates.tenant_id
  delete updates.is_system
  delete updates.created_at

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const allItems = await adapter.read!(dbConfig, 'nxf_menus')
  const item = (allItems ?? []).find((m: any) => resolveDocumentId(m) === menu_id)
  if (item?.is_system) {
    return NextResponse.json({ success: false, error: 'errors.systemItemProtected' }, { status: 403 })
  }

  // Real PK is menu_id, not id — the idColumn arg is required.
  await adapter.update!(dbConfig, 'nxf_menus', menu_id, {
    ...updates,
    updated_at: new Date().toISOString(),
  }, 'menu_id')

  return NextResponse.json({ success: true })
}