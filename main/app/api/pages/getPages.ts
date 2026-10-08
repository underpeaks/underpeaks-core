// app/api/pages/getPages.ts
import { NextRequest, NextResponse }  from 'next/server'
import { resolveDocumentId }          from './resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function handleGetPages(req: NextRequest): Promise<NextResponse> {
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
    return NextResponse.json({ success: true, pages: [] })
  }

  const projectId = project.project_id ?? project.id

  const allPages = await adapter.readAll!(dbConfig, 'nxf_pages')
  const pages = (allPages ?? [])
    .filter((p: any) => p.project_id === projectId)
    .map((p: any) => ({
      ...p,
      page_id:  resolveDocumentId(p),
      name:     p.title ?? p.name ?? '',
      // The list and drawer read model_id / template; the table stores
      // model and template_type. Expose both spellings.
      model_id: p.model_id ?? p.model ?? null,
      template: p.template_type ?? p.template ?? '',
    }))

  return NextResponse.json({ success: true, pages })
}