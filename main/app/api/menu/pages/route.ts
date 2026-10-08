// app/api/menu/pages/route.ts
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

    // Only admin-visibility pages can be linked from the admin menu.
    const pages = (allPages ?? [])
      .filter((p: any) => p.project_id === projectId && p.visibility === 'admin')
      .map((p: any) => {
        const modelRef = p.model_id ?? p.model ?? null
        const model = (allModels ?? []).find((m: any) => (m.id || m.sm_id) === modelRef)
        return {
          // nxf_pages' real PK is page_id.
          page_id:    p.page_id,
          title:      p.title ?? '',
          slug:       p.slug ?? '',
          model_id:   modelRef,
          model_name: model?.name ?? null,
        }
      })

    return NextResponse.json({ success: true, pages })
  } catch (err: any) {
    console.error('[GET /api/menu/pages]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}