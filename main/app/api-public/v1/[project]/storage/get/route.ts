// app/api-public/v1/[project]/storage/get/route.ts
/**
 * api-public/v1/[project]/storage/get/route.ts
 *
 * Core (self-hosted) — single file metadata lookup by ?id=<storage_id>.
 * Reads nxf_storage via the adapter.
 *
 * Auth: X-API-Key header → validateCoreApiKey.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
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

  const id = new URL(req.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400, headers: coreCors() })
  }

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const rows = (await (adapter as any).readAll(dbConfig, 'nxf_storage')) ?? []
    const row  = rows.find((r: any) => r.storage_id === id && r.project_id === auth.projectId)

    if (!row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404, headers: coreCors() })
    }

    return NextResponse.json({
      file: {
        storage_id: row.storage_id,
        file_name:  row.file_name,
        folder:     row.folder,
        url:        row.url,
        mime_type:  row.mime_type,
        size:       row.size,
        created_at: row.created_at,
      },
    }, { headers: coreCors() })
  } catch (err: any) {
    console.error('[api-public] storage get failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: coreCors() })
  }
}