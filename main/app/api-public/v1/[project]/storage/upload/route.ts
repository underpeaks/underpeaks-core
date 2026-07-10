// app/api-public/v1/[project]/storage/upload/route.ts
/**
 * api-public/v1/[project]/storage/upload/route.ts
 *
 * Core (self-hosted) — Payload-model file upload.
 *
 * Accepts multipart/form-data (`file`, optional `folder`). Delegates to the
 * configured adapter's uploadFile(), then writes an nxf_storage row so list/
 * get/delete/serve all work uniformly across the 5 adapters.
 *
 * URL model: disk adapters (postgres/mysql/mongodb) return a permanent public
 * /uploads/... path. supabase/firebase return a signed URL that expires — so
 * for those the permanent URL served to apps points at this API's file/[id]
 * route, which streams the bytes. No per-file token (Core is public by design).
 *
 * Auth: X-API-Key header → validateCoreApiKey (carries project_id + tenant_id).
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter '
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

  let form: FormData
  try { form = await req.formData() } catch {
    return NextResponse.json({ error: 'multipart/form-data required' }, { status: 400, headers: coreCors() })
  }

  const file = form.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'file field is required' }, { status: 400, headers: coreCors() })
  }

  const folder   = (form.get('folder') as string) || 'uploads'
  const buffer   = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || 'application/octet-stream'
  const safeName = `${crypto.randomUUID()}_${(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // adapter uploads to its backend and returns a url
    // (disk: permanent /uploads/... ; supabase/firebase: 7-day signed url)
    const adapterUrl = await (adapter as any).uploadFile(folder, safeName, buffer, mimeType)

    const storage_id = crypto.randomUUID()
    const file_path  = `${folder}/${safeName}`

    // For disk adapters the adapter url is permanent and public — store it.
    // For supabase/firebase the signed url expires, so store our own
    // permanent serve url instead.
    const isDisk = dbConfig.type === 'postgres' || dbConfig.type === 'mysql' || dbConfig.type === 'mongodb'
    const url = isDisk
      ? adapterUrl
      : `${process.env.NEXT_PUBLIC_APP_DOMAIN}/api-public/v1/${auth.projectId}/storage/file/${storage_id}`

    await (adapter as any).create(dbConfig, 'nxf_storage', {
      storage_id,
      project_id: auth.projectId,
      tenant_id:  auth.tenantId,
      folder,
      file_name:  safeName,
      file_path,
      url,
      mime_type:  mimeType,
      size:       buffer.length,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json(
      { storage_id, url, file_name: safeName, size: buffer.length },
      { status: 201, headers: coreCors() }
    )
  } catch (err: any) {
    console.error('[api-public] storage upload failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500, headers: coreCors() })
  }
}