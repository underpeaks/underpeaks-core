// app/api-public/v1/[project]/storage/list/route.ts
/**
 * api-public/v1/[project]/storage/list/route.ts
 *
 * Core (self-hosted) — list stored files for this install.
 * Reads nxf_storage via the adapter (Core single-project, no svc()).
 *
 * Auth: X-API-Key header → validateCoreApiKey.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter '
import { validateCoreApiKey }        from '@/app/lib/coreApiAuth'
import { coreCors }                  from '@/app/lib/customerAuthCore'

type Params = { project: string }

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: coreCors() })
}

export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  await params

  const apiKey = req.headers.get('X-API-Key') ?? req.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json({ error: 'X-API-Key header is required' }, { status: 401, headers: coreCors() })
  }

  const auth = await validateCoreApiKey(apiKey)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401, headers: coreCors() })
  }

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const { searchParams } = new URL(req.url)
    const folder = searchParams.get('folder')

    let rows = (await (adapter as any).readAll(dbConfig, 'nxf_storage')) ?? []
    rows = rows.filter((r: any) => r.project_id === auth.projectId && r.file_name)
    if (folder) rows = rows.filter((r: any) => r.folder === folder)

    const files = rows.map((r: any) => ({
      storage_id: r.storage_id,
      file_name:  r.file_name,
      folder:     r.folder,
      url:        r.url,
      mime_type:  r.mime_type,
      size:       r.size,
      created_at: r.created_at,
    }))

    return NextResponse.json({ files }, { headers: coreCors() })
  } catch (err: any) {
    console.error('[api-public] storage list failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: coreCors() })
  }
}