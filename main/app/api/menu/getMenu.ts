import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function handleGetMenu(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  // Resolve project from nxf_system_projects[0] — never by owner
  const allProjects = await adapter.readAll!(dbConfig, 'nxf_system_projects')
  const project     = (allProjects ?? [])[0]

  if (!project) {
    console.log('[handleGetMenu] no project found — returning empty')
    return NextResponse.json({ success: true, items: [] })
  }

  const projectId = project.project_id ?? project.id
  console.log('[handleGetMenu] projectId:', projectId)

  const allItems = await adapter.readAll!(dbConfig, 'nxf_menus').catch(() => [])
  console.log('[handleGetMenu] total menu items in DB:', allItems?.length ?? 0)

  const items = (allItems ?? [])
    .filter((m: any) => m.project_id === projectId)
    .map((m: any) => ({
      ...m,
      id: resolveDocumentId(m),  // preserve menu_id — only overwrite id
    }))

  console.log('[handleGetMenu] filtered items for project:', items.length)

  return NextResponse.json({ success: true, items })
}