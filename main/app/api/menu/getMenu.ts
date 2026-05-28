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

  const project = adapter.findProjectByOwnerId
    ? await adapter.findProjectByOwnerId(dbConfig, userId)
    : null

  if (!project) {
    return NextResponse.json({ success: true, items: [] })
  }

  const projectId = project.id || project.project_id

  const allItems = await adapter.read!(dbConfig, 'nxf_menu')
  const items = (allItems ?? [])
    .filter((m: any) => m.project_id === projectId)
    .map((m: any) => ({
      ...m,
      menu_id: resolveDocumentId(m),
    }))

  return NextResponse.json({ success: true, items })
}