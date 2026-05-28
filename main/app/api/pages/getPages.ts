import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function handleGetPages(req: NextRequest): Promise<NextResponse> {
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
    return NextResponse.json({ success: true, pages: [] })
  }

  const projectId = project.id || project.project_id
  const allPages  = await adapter.read!(dbConfig, 'nxf_pages')
  const pages = (allPages ?? [])
    .filter((p: any) => p.project_id === projectId && (p.page_type === 'admin' || !p.page_type))
    .map((p: any) => ({
      ...p,
      page_id: resolveDocumentId(p),
    }))

  return NextResponse.json({ success: true, pages })
}