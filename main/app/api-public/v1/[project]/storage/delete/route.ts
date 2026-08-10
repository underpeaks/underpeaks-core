// app/api-public/v1/[project]/storage/delete/route.ts
/**
 * api-public/v1/[project]/storage/delete/route.ts
 *
 * Core (self-hosted) — delete a file.
 * Body: { id | storage_id }. Removes bytes via adapter.deleteFile(folder,
 * file_name), then removes the nxf_storage row.
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

export async function POST(req: NextRequest, { params }: { params: Promise<Params> }) {
  await params

  const apiKey = req.headers.get('X-API-Key') ?? req.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json({ error: 'X-API-Key header is required' }, { status: 401, headers: coreCors() })
  }

  const auth = await validateCoreApiKey(apiKey)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401, headers: coreCors() })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: coreCors() })
  }

  const id = body.id ?? body.storage_id
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400, headers: coreCors() })
  }

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    const rows = (await (adapter as any).readAll(dbConfig, 'nxf_storage')) ?? []
    const row  = rows.find((r: any) => r.storage_id === id && r.project_id === auth.projectId)

    if (!row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404, headers: coreCors() })
    }

    await (adapter as any).deleteFile(row.folder, row.file_name)
    await (adapter as any).delete(dbConfig, 'nxf_storage', row.storage_id, 'storage_id')

    return NextResponse.json({ success: true }, { headers: coreCors() })
  } catch (err: any) {
    console.error('[api-public] storage delete failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: coreCors() })
  }
}