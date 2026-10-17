// app/api/storage/import-url/route.ts
/**
 * POST /api/storage/import-url
 *
 * Downloads a file from a remote URL and stores it.
 *
 * Request body (JSON): { folder: string, url: string }
 *
 * Firebase / Supabase: the file is uploaded to the bucket through the adapter.
 * Every other adapter:  the file is saved to public/uploads[/folder], the same
 *                       way /api/storage/upload-file does it, so it is served
 *                       at /uploads/... and listed in the media library.
 *
 * Metadata is always written to nxf_storage once, by this route.
 * file_path is stored as `${folder}/${fileName}` (root = `uploads/${fileName}`)
 * so rename / move / delete, which match on file_path, find the row.
 *
 * SECURITY (Oct 2026):
 *  - Signed-in console user required.
 *  - The download goes through safeFetch (app/lib/safeFetch.ts): private,
 *    loopback and cloud-metadata addresses are refused, redirects are
 *    re-checked, size is capped while streaming, and there is a timeout.
 *  - The file extension comes from an allow-list of content types. Anything
 *    else (HTML, scripts, SVG, unknown types) is refused, so nothing
 *    executable can land in public/uploads.
 *  - Errors no longer echo internal messages.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import crypto                        from 'crypto'
import { v4 as uuidv4 }              from 'uuid'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'
import { safeFetch, SafeFetchError } from '@/app/lib/safeFetch'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

/** Allowed content types and the extension each one gets. */
const EXT_BY_MIME: Record<string, string> = {
  'image/png':        'png',
  'image/jpeg':       'jpg',
  'image/gif':        'gif',
  'image/webp':       'webp',
  'image/avif':       'avif',
  'application/pdf':  'pdf',
  'text/plain':       'txt',
  'text/csv':         'csv',
  'application/json': 'json',
  'application/zip':  'zip',
  'video/mp4':        'mp4',
  'video/webm':       'webm',
  'audio/mpeg':       'mp3',
  'audio/wav':        'wav',
  'audio/ogg':        'ogg',
}

/** A folder path: string, <= 300 chars, no "..", ".", backslash or null byte. */
function validFolder(v: unknown): v is string {
  if (typeof v !== 'string' || !v || v.length > 300) return false
  if (v.includes('\\') || v.includes('\0')) return false
  return !v.split('/').some((seg) => seg === '..' || seg === '.')
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionUser(req)
  if (!auth.ok) return auth.response

  try {
    // 1. Validate input -------------------------------------------------------
    const body = await req.json().catch(() => null)
    const folderRaw = body?.folder
    const remoteUrl = body?.url

    if (!validFolder(folderRaw) || typeof remoteUrl !== 'string' || !remoteUrl || remoteUrl.length > 2048)
      return NextResponse.json({ error: 'folder and url are required' }, { status: 400 })

    // "uploads" is the root folder
    const folder = folderRaw === 'uploads' ? '' : folderRaw

    // 2. Download (SSRF-safe) -------------------------------------------------
    let downloaded
    try {
      downloaded = await safeFetch(remoteUrl, { maxBytes: MAX_BYTES })
    } catch (err) {
      if (err instanceof SafeFetchError)
        return NextResponse.json({ error: err.message }, { status: err.status })
      throw err
    }

    const mimeType = downloaded.contentType
    const ext      = EXT_BY_MIME[mimeType]
    if (!ext)
      return NextResponse.json({ error: 'This file type is not allowed' }, { status: 400 })

    const buffer   = downloaded.buffer
    const fileName = `imported_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`

    const adapter = getConfiguredAdapter()

    // 3. Resolve project_id / tenant_id --------------------------------------
    let project_id: string | null = null
    let tenant_id:  string | null = null

    try {
      const project = await adapter.findProjectByOwnerId?.(adapter.config, auth.userId)
      project_id    = project?.id ?? project?.project_id ?? null
      tenant_id     = project?.tenant_id ?? null
    } catch (err: any) {
      console.warn('[import-url] project lookup failed (non-fatal):', err?.message ?? err)
    }

    // Single-tenant fallback: use the one project row
    if ((!project_id || !tenant_id) && adapter.read) {
      try {
        const projects = await adapter.read(adapter.config, 'nxf_system_projects')
        const first    = (projects ?? [])[0]
        project_id     = project_id ?? first?.project_id ?? first?.id ?? null
        tenant_id      = tenant_id  ?? first?.tenant_id ?? null
      } catch {
        // metadata will be skipped below
      }
    }

    const storedFolder = folder || 'uploads'
    const filePath     = `${storedFolder}/${fileName}`

    const saveMetadata = async (url: string) => {
      try {
        if (!adapter.create) return
        if (!project_id || !tenant_id) {
          console.warn('[import-url] Missing project_id or tenant_id — skipping metadata save')
          return
        }
        await adapter.create(adapter.config, 'nxf_storage', {
          storage_id: uuidv4(),
          project_id,
          tenant_id,
          folder:     storedFolder,
          file_name:  fileName,
          file_path:  filePath,
          url,
          mime_type:  mimeType,
          size:       buffer.length,
          created_at: new Date().toISOString(),
        })
      } catch (err: any) {
        console.warn('[import-url] Metadata save failed (non-fatal):', err?.message ?? err)
      }
    }

    const sizeLabel = buffer.length > 1024 * 1024
      ? `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(buffer.length / 1024)} KB`

    const uploaded = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

    // 4a. Cloud adapters: upload the bytes we already downloaded --------------
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE
    if (dbType === 'firebase' || dbType === 'supabase') {
      if (!adapter.uploadFile)
        return NextResponse.json({ error: 'Upload is not supported by the current storage adapter' }, { status: 400 })

      const url = await adapter.uploadFile(folder, fileName, buffer, mimeType)

      await saveMetadata(url)

      return NextResponse.json({
        success: true,
        file: {
          id:         filePath,
          name:       fileName,
          url,
          size:       sizeLabel,
          mimeType,
          folder:     storedFolder,
          folderPath: filePath,
          uploaded,
        },
      })
    }

    // 4b. Local storage: save under public/uploads ---------------------------
    const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads')
    const dirPath     = folder ? path.resolve(uploadsRoot, folder) : uploadsRoot

    // Keep the destination inside public/uploads
    if (dirPath !== uploadsRoot && !dirPath.startsWith(uploadsRoot + path.sep))
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })

    fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(path.join(dirPath, fileName), buffer)

    const appDomain   = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? '').replace(/\/$/, '')
    const relativeUrl = folder ? `/uploads/${folder}/${fileName}` : `/uploads/${fileName}`
    const fileUrl     = appDomain ? `${appDomain}${relativeUrl}` : relativeUrl

    await saveMetadata(fileUrl)

    return NextResponse.json({
      success: true,
      file: {
        id:         filePath,
        name:       fileName,
        url:        fileUrl,
        size:       sizeLabel,
        mimeType,
        folder:     storedFolder,
        folderPath: filePath,
        uploaded,
      },
    })

  } catch (err: any) {
    console.error('[import-url] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}