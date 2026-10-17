// app/api/storage/upload-file/route.ts
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import path                          from 'path'
import fs                            from 'fs'
import sharp                         from 'sharp'
import { v4 as uuidv4 }              from 'uuid'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'
import { writeLocalFile }            from '@/app/db-adapter/utils/storage-helpers'

// Largest file accepted. Override with NXF_MAX_UPLOAD_MB in .env.local.
const MAX_BYTES = (Number(process.env.NXF_MAX_UPLOAD_MB) || 50) * 1024 * 1024

// Files that a browser or server could run or render as a page. Refused.
const BLOCKED_EXT = new Set([
  'html', 'htm', 'xhtml', 'shtml', 'js', 'mjs', 'cjs', 'jsp', 'php', 'phtml',
  'asp', 'aspx', 'exe', 'dll', 'msi', 'bat', 'cmd', 'com', 'sh', 'ps1', 'jar',
  'svg', 'xml', 'xsl',
])

const FIT_OPTIONS = new Set(['cover', 'contain', 'fill', 'inside', 'outside'])

/** Returns the folder without leading/trailing slashes, or null if it is not safe. */
function cleanFolder(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw || raw.length > 300) return null
  if (raw.includes('\0') || raw.includes('\\')) return null

  const parts = raw.split('/').filter(Boolean)
  if (parts.some((p) => p === '.' || p === '..')) return null

  return parts.join('/')
}

type Resize = { width?: number; height?: number; fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' }

/** null = no resize asked for, false = the resize value is invalid. */
function parseResize(raw: unknown): Resize | null | false {
  if (typeof raw !== 'string' || !raw) return null

  try {
    const r = JSON.parse(raw)
    if (!r || typeof r !== 'object') return false

    const dim = (v: unknown): number | undefined | false => {
      if (v === undefined || v === null) return undefined
      return Number.isInteger(v) && (v as number) > 0 && (v as number) <= 8000 ? (v as number) : false
    }

    const width  = dim(r.width)
    const height = dim(r.height)
    if (width === false || height === false) return false

    const fit = r.fit === undefined ? 'inside' : r.fit
    if (typeof fit !== 'string' || !FIT_OPTIONS.has(fit)) return false

    return { width, height, fit: fit as Resize['fit'] }
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only signed-in console users may upload.
    const auth = await requireSessionUser(req)
    if (!auth.ok) return auth.response

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file      = formData.get('file')
    const folderRaw = formData.get('folder')
    const resizeRaw = formData.get('resize')
    const mode      = formData.get('mode') === 'storage' ? 'storage' : 'local'

    if (!file || typeof file === 'string' || !folderRaw)
      return NextResponse.json({ error: 'file and folder are required' }, { status: 400 })

    const folderClean = cleanFolder(folderRaw)
    if (folderClean === null)
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })

    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: 'File is too large' }, { status: 413 })

    const resize = parseResize(resizeRaw)
    if (resize === false)
      return NextResponse.json({ error: 'Invalid resize options' }, { status: 400 })

    // The media library calls the root "uploads"; it is stored as ''.
    const folder = folderClean === 'uploads' ? '' : folderClean

    // Base domain used to build absolute URLs for local storage.
    const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? '').replace(/\/$/, '')

    // ── Project / tenant of the signed-in user ───────────────────────────────
    let project_id: string | null = null
    let tenant_id:  string | null = null

    try {
      const adapter = getConfiguredAdapter()
      const project = await adapter.findProjectByOwnerId?.(adapter.config, auth.userId)
      project_id    = project?.id ?? project?.project_id ?? null
      tenant_id     = project?.tenant_id ?? null
    } catch (err: any) {
      console.warn('[upload-file] project lookup failed:', err?.message ?? err)
    }

    // Single-tenant fallback: Core has exactly one project row
    if (!project_id || !tenant_id) {
      try {
        const adapter  = getConfiguredAdapter()
        const projects = adapter.read
          ? await adapter.read(adapter.config, 'nxf_system_projects')
          : []
        const first    = (projects ?? [])[0]
        project_id     = project_id ?? first?.project_id ?? first?.id ?? null
        tenant_id      = tenant_id  ?? first?.tenant_id ?? null
      } catch (err: any) {
        console.warn('[upload-file] project fallback failed:', err?.message ?? err)
      }
    }

    // ── File name and type ───────────────────────────────────────────────────
    const isImage = (file.type ?? '').startsWith('image/')

    const rawExt = path
      .extname(file.name || '')
      .replace('.', '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10)

    // Images are always re-encoded as PNG, so their original extension is ignored.
    const ext = isImage ? 'png' : rawExt

    if (BLOCKED_EXT.has(ext))
      return NextResponse.json({ error: 'This file type is not allowed' }, { status: 400 })

    // Dots in the base name become underscores, so 'a.php.png' cannot hide a second extension.
    const baseName =
      path
        .basename(file.name || '', path.extname(file.name || ''))
        .replace(/[^a-z0-9_-]/gi, '_')
        .toLowerCase()
        .slice(0, 100) || 'file'

    const filename = ext ? `${baseName}.${ext}` : baseName
    const mimeType = isImage
      ? 'image/png'
      : (file.type || 'application/octet-stream').slice(0, 100)

    // ── Process ──────────────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer())
    let processed: Buffer = buffer

    if (isImage) {
      try {
        processed = resize
          ? await sharp(buffer)
              .resize({
                width:              resize.width,
                height:             resize.height,
                fit:                resize.fit,
                withoutEnlargement: true,
              })
              .png({ compressionLevel: 9 })
              .toBuffer()
          : await sharp(buffer)
              .png({ compressionLevel: 9 })
              .toBuffer()
      } catch {
        return NextResponse.json({ error: 'Could not process this image' }, { status: 400 })
      }
    }

    const sizeLabel = processed.length > 1024 * 1024
      ? `${(processed.length / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(processed.length / 1024)} KB`

    const saveMetadata = async (url: string, filePath: string) => {
      try {
        const adapter = getConfiguredAdapter()
        if (!adapter.create) return

        if (!project_id || !tenant_id) {
          console.warn('[upload-file] Missing project_id or tenant_id — skipping metadata save (both are NOT NULL on nxf_storage)')
          return
        }

        await adapter.create(adapter.config, 'nxf_storage', {
          storage_id: uuidv4(),
          project_id,
          tenant_id,
          folder:     folder || 'uploads',
          file_name:  filename,
          file_path:  filePath,
          url,
          mime_type:  mimeType,
          size:       processed.length,
          created_at: new Date().toISOString(),
        })
      } catch (err: any) {
        console.warn('[upload-file] Metadata save failed:', err?.message ?? err)
      }
    }

    // ── Storage mode: cloud adapters or public/uploads ───────────────────────
    if (mode === 'storage') {
      const dbType = process.env.NEXT_PUBLIC_DB_TYPE

      if (dbType === 'firebase' || dbType === 'supabase') {
        const adapter = getConfiguredAdapter()

        if (!adapter.uploadFile)
          return NextResponse.json(
            { error: 'File upload is not supported by the current storage adapter' },
            { status: 400 }
          )

        // Cloud adapters already return a full public URL.
        const url      = await adapter.uploadFile(folder, filename, processed, mimeType)
        const filePath = folder ? `${folder}/${filename}` : filename

        await saveMetadata(url, filePath)

        return NextResponse.json({
          success:  true,
          url,
          name:     filename,
          size:     sizeLabel,
          folder:   folder || 'uploads',
          mimeType,
        })
      }

      // writeLocalFile keeps the file inside public/uploads
      writeLocalFile(folder, filename, processed)

      const relativeUrl = folder ? `/uploads/${folder}/${filename}` : `/uploads/${filename}`
      const url         = appDomain ? `${appDomain}${relativeUrl}` : relativeUrl

      await saveMetadata(url, relativeUrl)

      return NextResponse.json({
        success:  true,
        url,
        name:     filename,
        size:     sizeLabel,
        folder:   folder || 'uploads',
        mimeType,
      })
    }

    // ── Local mode: public/<folder> ──────────────────────────────────────────
    const publicRoot = path.resolve(process.cwd(), 'public')
    const dirName    = folderClean || 'uploads'
    const dirPath    = path.resolve(publicRoot, dirName)

    // The folder must stay inside /public
    if (!dirPath.startsWith(publicRoot + path.sep))
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(path.join(dirPath, filename), processed)

    const relativeUrl = `/${dirName}/${filename}`
    const url         = appDomain ? `${appDomain}${relativeUrl}` : relativeUrl

    return NextResponse.json({
      success:  true,
      url,
      name:     filename,
      size:     sizeLabel,
      folder:   dirName,
      mimeType,
    })

  } catch (err: any) {
    console.error('[upload-file] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}