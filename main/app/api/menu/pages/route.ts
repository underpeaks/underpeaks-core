//app/api/menu/pages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    if (!userId) {
      return NextResponse.json({ success: false, error: 'errors.missingUserId' }, { status: 400 })
    }

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const allProjects = await adapter.readAll!(dbConfig, 'nxf_system_projects')
    const project     = (allProjects ?? [])[0]

    if (!project) {
      return NextResponse.json({ success: true, pages: [] })
    }

    const projectId = project.project_id ?? project.id

    const [allPages, allModels] = await Promise.all([
      adapter.readAll!(dbConfig, 'nxf_pages'),
      adapter.readAll!(dbConfig, 'nxf_system_models'),
    ])

    const pages = (allPages ?? [])
      .filter((p: any) => p.project_id === projectId && p.page_type === 'admin')
      .map((p: any) => {
        const model = (allModels ?? []).find((m: any) => (m.id || m.sm_id) === p.model_id)
        return {
          // FIX: resolveDocumentId() only checks doc.id / doc.menu_id, but
          // nxf_pages' real PK is page_id — neither field it checks exists
          // on a page row, so every page_id came back undefined and the
          // sidebar's menu-to-page matching silently failed for every item.
          page_id:    p.page_id,
          title:      p.title ?? '',
          slug:       p.slug ?? '',
          model_id:   p.model_id ?? null,
          model_name: model?.name ?? null,
        }
      })

    return NextResponse.json({ success: true, pages })
  } catch (err: any) {
    console.error('[GET /api/menu/pages]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}