import { NextRequest, NextResponse } from 'next/server'
import { resolveDocumentId }         from '../resolveDocumentId'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
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

    const [allPages, allModels] = await Promise.all([
      adapter.read!(dbConfig, 'nxf_pages'),
      adapter.read!(dbConfig, 'nxf_system_models'),
    ])

    const pages = (allPages ?? [])
      .filter((p: any) => p.project_id === projectId && p.page_type === 'admin')
      .map((p: any) => {
        const model = (allModels ?? []).find((m: any) => (m.id || m.sm_id) === p.model_id)
        return {
          page_id:    resolveDocumentId(p),
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