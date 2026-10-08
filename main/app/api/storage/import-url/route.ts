// app/api/storage/import-url/route.ts
/**
 * POST /api/storage/import-url
 *
 * Downloads a file from a remote URL and stores it.
 *
 * Request body (JSON): { folder: string, url: string }
 *
 * Firebase / Supabase: the adapter downloads and stores the file in the bucket.
 * Every other adapter:  the file is saved to public/uploads[/folder], the same
 *                       way /api/storage/upload-file does it, so it is served
 *                       at /uploads/... and listed in the media library.
 *
 * Metadata is always written to nxf_storage once, by this route.
 * file_path is stored as `${folder}/${fileName}` (root = `uploads/${fileName}`)
 * so rename / move / delete, which match on file_path, find the row.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import { v4 as uuidv4 }              from 'uuid'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

export async function POST(req: NextRequest) {
  try {
    // 1. Validate input -------------------------------------------------------
    const { folder: folderRaw, url: remoteUrl } = await req.json()
    if (!folderRaw || !remoteUrl)
      return NextResponse.json({ error: 'folder and url are required' }, { status: 400 })

    let parsed: URL
    try {
      parsed = new URL(remoteUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return NextResponse.json({ error: 'Only http and https URLs are allowed' }, { status: 400 })

    // "uploads" is the root folder
    const folder = folderRaw === 'uploads' ? '' : String(folderRaw)

    const adapter = getConfiguredAdapter()

    // 2. Resolve project_id / tenant_id --------------------------------------
    let project_id: string | null = null
    let tenant_id:  string | null = null

    try {
      const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? null
      if (token) {
        const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
        const uid     = decoded?.uid ?? decoded?.user_id ?? decoded?.id ?? null
        if (uid) {
          const project = await adapter.findProjectByOwnerId?.(adapter.config, uid)
          project_id    = project?.id ?? project?.project_id ?? null
          tenant_id     = project?.tenant_id ?? null
        }
      }
    } catch (err: any) {
      console.warn('[import-url] auth lookup failed (non-fatal):', err?.message ?? err)
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

    const saveMetadata = async (data: {
      file_name: string; file_path: string; url: string; mime_type: string; size: number
    }) => {
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
          folder:     folder || 'uploads',
          ...data,
          created_at: new Date().toISOString(),
        })
      } catch (err: any) {
        console.warn('[import-url] Metadata save failed (non-fatal):', err?.message ?? err)
      }
    }

    // 3a. Cloud adapters: the adapter downloads and stores the file ----------
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE
    if (dbType === 'firebase' || dbType === 'supabase') {
      if (!adapter.importFromUrl)
        return NextResponse.json({ error: 'importFromUrl not supported' }, { status: 400 })

      const file = await adapter.importFromUrl(folder, remoteUrl)

      await saveMetadata({
        file_name: file.name,
        file_path: file.folderPath,
        url:       file.url,
        mime_type: file.mimeType,
        size:      parseInt(file.size) || 0,
      })

      return NextResponse.json({ success: true, file })
    }

    // 3b. Local storage: save under public/uploads ---------------------------
    const response = await fetch(remoteUrl)
    if (!response.ok)
      return NextResponse.json(
        { error: `Failed to fetch URL (${response.status})` },
        { status: 400 }
      )

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > MAX_BYTES)
      return NextResponse.json({ error: 'File is larger than 25 MB' }, { status: 400 })

    const mimeType = (response.headers.get('content-type') ?? 'application/octet-stream')
      .split(';')[0]
      .trim()
    const urlExt   = path.extname(parsed.pathname).replace('.', '').toLowerCase()
    const ext      = (mimeType.split('/')[1] ?? urlExt ?? 'bin')
      .replace(/[^a-z0-9]/gi, '') || 'bin'
    const fileName = `imported_${Date.now()}.${ext}`

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

    // Same format as upload and as the rename / move / delete lookups
    const storedFolder = folder || 'uploads'
    const filePath     = `${storedFolder}/${fileName}`

    await saveMetadata({
      file_name: fileName,
      file_path: filePath,
      url:       fileUrl,
      mime_type: mimeType,
      size:      buffer.length,
    })

    const sizeLabel = buffer.length > 1024 * 1024
      ? `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(buffer.length / 1024)} KB`

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
        uploaded:   new Date().toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
      },
    })

  } catch (err: any) {
    console.error('[import-url] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}