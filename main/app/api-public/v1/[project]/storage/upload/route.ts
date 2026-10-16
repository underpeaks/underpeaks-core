// app/api-public/v1/[project]/storage/upload/route.ts
/**
 * api-public/v1/[project]/storage/upload/route.ts
 *
 * Core (self-hosted) — Payload-model file upload.
 *
 * Accepts multipart/form-data (`file`, optional `folder`). Delegates to the
 * configured adapter's uploadFile(), then makes sure exactly ONE nxf_storage
 * row exists for the file, tagged with project_id / tenant_id.
 *
 * Disk adapters (postgres/mysql/mongodb): uploadFile() already inserts its own
 * nxf_storage row, so we find that row and tag it instead of inserting a
 * duplicate. supabase/firebase don't insert, so we create the row here.
 *
 * URL model: disk adapters return a permanent public /uploads/... path.
 * supabase/firebase return a signed URL that expires — so for those the
 * permanent URL served to apps points at this API's file/[id] route, which
 * streams the bytes. No per-file token (Core is public by design).
 *
 * Auth: X-API-Key header → validateCoreApiKey (carries project_id + tenant_id).
 *
 * SECURITY HARDENING (Oct 2026):
 *  - `folder` must be plain path segments (letters, digits, - and _). Before,
 *    it went straight to the adapter, so "../../x" could write outside the
 *    uploads folder on disk adapters.
 *  - Size limit: NXF_MAX_UPLOAD_MB (default 50).
 *  - Executable / script / HTML file types are refused (they would be served
 *    from your own domain).
 *  - 500 responses no longer return internal error messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto                        from 'crypto'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { validateCoreApiKey }        from '@/app/lib/coreApiAuth'
import { coreCors }                  from '@/app/lib/customerAuthCore'

type Params = { project: string }

const MAX_BYTES = Math.max(1, Number(process.env.NXF_MAX_UPLOAD_MB ?? 50)) * 1024 * 1024

// Up to 4 path segments of letters, digits, '-' and '_'.
const FOLDER_RE = /^[A-Za-z0-9_-]{1,64}(\/[A-Za-z0-9_-]{1,64}){0,3}$/

const BLOCKED_EXT = new Set([
  'html', 'htm', 'xhtml', 'shtml', 'js', 'mjs', 'cjs', 'jsp', 'php', 'phtml',
  'asp', 'aspx', 'exe', 'dll', 'msi', 'bat', 'cmd', 'com', 'sh', 'ps1', 'jar',
])

function hasBlockedExt(name: string): boolean {
  // Check every dot-separated part, so "shell.php.jpg" is caught too.
  return name.toLowerCase().split('.').slice(1).some((p) => BLOCKED_EXT.has(p))
}

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

  const rawFolder = form.get('folder')
  const folder    = (typeof rawFolder === 'string' && rawFolder.trim()) ? rawFolder.trim() : 'uploads'
  if (!FOLDER_RE.test(folder)) {
    return NextResponse.json({ error: 'Invalid folder name' }, { status: 400, headers: coreCors() })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` },
      { status: 413, headers: coreCors() }
    )
  }
  if (hasBlockedExt(file.name || '') || /html|javascript|php/i.test(file.type || '')) {
    return NextResponse.json({ error: 'This file type is not allowed' }, { status: 400, headers: coreCors() })
  }

  const buffer   = Buffer.from(await file.arrayBuffer())
  const mimeType = /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(file.type || '') ? file.type : 'application/octet-stream'
  const safeName = `${crypto.randomUUID()}_${(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    // adapter uploads to its backend and returns a url
    // (disk: permanent /uploads/... ; supabase/firebase: 7-day signed url)
    const adapterUrl = await (adapter as any).uploadFile(folder, safeName, buffer, mimeType)

    const isDisk = dbConfig.type === 'postgres' || dbConfig.type === 'mysql' || dbConfig.type === 'mongodb'
    const file_path = `${folder}/${safeName}`

    if (isDisk) {
      // The adapter already inserted the row. Find it and tag it.
      const rows = (await (adapter as any).readAll(dbConfig, 'nxf_storage')) ?? []
      const existing = rows.find((r: any) => r.file_name === safeName)

      if (existing) {
        await (adapter as any).update(
          dbConfig,
          'nxf_storage',
          existing.storage_id,
          { project_id: auth.projectId, tenant_id: auth.tenantId },
          'storage_id'
        )

        return NextResponse.json(
          { storage_id: existing.storage_id, url: existing.url ?? adapterUrl, file_name: safeName, size: buffer.length },
          { status: 201, headers: coreCors() }
        )
      }

      // Safety net: adapter row not found, create one so the file is never untracked.
      const storage_id = crypto.randomUUID()
      await (adapter as any).create(dbConfig, 'nxf_storage', {
        storage_id,
        project_id: auth.projectId,
        tenant_id:  auth.tenantId,
        folder,
        file_name:  safeName,
        file_path,
        url:        adapterUrl,
        mime_type:  mimeType,
        size:       buffer.length,
        created_at: new Date().toISOString(),
      })

      return NextResponse.json(
        { storage_id, url: adapterUrl, file_name: safeName, size: buffer.length },
        { status: 201, headers: coreCors() }
      )
    }

    // supabase / firebase: signed url expires, so store our own permanent serve url.
    const storage_id = crypto.randomUUID()
    const url = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/api-public/v1/${auth.projectId}/storage/file/${storage_id}`

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
    return NextResponse.json({ error: 'Upload failed' }, { status: 500, headers: coreCors() })
  }
}