// app/api/storage/upload-file/route.ts
/**
 * POST /api/storage/upload-file
 * Multipart form: file, folder, optional resize (JSON), optional mode.
 *
 * Console file upload (media library, field uploads, branding).
 *
 * SECURITY HARDENING (Oct 2026):
 *  - Signed-in console users only (the installer may also use it on a fresh
 *    install, for the logo step). Before, anyone could upload.
 *  - `folder` must be plain path segments. Before, "../../x" was joined into a
 *    disk path, so a file could be written anywhere on the server.
 *  - Size limit: NXF_MAX_UPLOAD_MB (default 50).
 *  - Images are re-encoded as PNG. Other files keep their name, but script,
 *    HTML, SVG and executable types are refused (they would run from your own
 *    domain). The extension comes from a safe list of characters only.
 *  - `resize` and `mode` are validated.
 */

import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import sharp                         from 'sharp'
import { v4 as uuidv4 }              from 'uuid'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'
import { requireInstallerAccess }    from '@/app/lib/installLock'

const MAX_BYTES = Math.max(1, Number(process.env.NXF_MAX_UPLOAD_MB ?? 50)) * 1024 * 1024

const BLOCKED_EXT = new Set([
  'html', 'htm', 'xhtml', 'shtml', 'xht', 'js', 'mjs', 'cjs', 'jsp', 'php',
  'phtml', 'php3', 'php4', 'php5', 'asp', 'aspx', 'exe', 'dll', 'msi', 'bat',
  'cmd', 'com', 'sh', 'ps1', 'jar', 'svg', 'svgz', 'xml', 'xsl', 'xslt',
  'swf', 'hta', 'vbs', 'scr',
])

const FIT_VALUES = new Set(['cover', 'contain', 'fill', 'inside', 'outside'])

/** Every dot-separated part is checked, so "shell.php.jpg" is caught too. */
function hasBlockedExt(name: string): boolean {
  return name.toLowerCase().split('.').slice(1).some((p) => BLOCKED_EXT.has(p))
}

/**
 * Up to 5 path segments, each starting with a letter or digit and made of
 * letters, digits, space, '_', '.' and '-'. No "..", no backslashes.
 */
function cleanFolder(raw: string): string | null {
  if (raw.includes('\\') || raw.includes('\0')) return null
  const f = raw.trim().replace(/^\/+|\/+$/g, '')
  if (!f || f.length > 200) return null
  const parts = f.split('/')
  if (parts.length > 5) return null
  for (const p of parts) {
    if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/.test(p) || p.includes('..')) return null
  }
  return parts.join('/')
}

/** A path inside baseDir, or an error. */
function resolveInside(baseDir: string, relative: string): string {
  const base   = path.resolve(baseDir)
  const target = path.resolve(base, relative)
  if (target !== base && !target.startsWith(base + path.sep)) throw new Error('Invalid folder')
  return target
}

function parseResize(raw: string | null):
  | { ok: true;  value: { width?: number; height?: number; fit?: any } | null }
  | { ok: false } {
  if (!raw) return { ok: true, value: null }
  try {
    const r = JSON.parse(raw)
    if (!r || typeof r !== 'object') return { ok: false }
    const dim = (v: unknown) =>
      v === undefined || v === null
        ? undefined
        : (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 8000 ? (v as number) : NaN)
    const width  = dim(r.width)
    const height = dim(r.height)
    if (Number.isNaN(width) || Number.isNaN(height)) return { ok: false }
    const fit = r.fit === undefined ? undefined : r.fit
    if (fit !== undefined && !FIT_VALUES.has(fit)) return { ok: false }
    return { ok: true, value: { width, height, fit } }
  } catch {
    return { ok: false }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Signed-in console users; on a fresh install the installer may upload too.
    const session = await requireSessionUser(req)
    if (!session.ok) {
      const gate = await requireInstallerAccess(req)
      if (!gate.ok) return session.response
    }

    const formData  = await req.formData()
    const file      = formData.get('file')   as File   | null
    const folderRaw = formData.get('folder') as string | null
    const resizeRaw = formData.get('resize') as string | null
    const modeRaw   = formData.get('mode')   as string | null

    if (!file || !folderRaw || typeof folderRaw !== 'string')
      return NextResponse.json(
        { error: 'file and folder are required' },
        { status: 400 }
      )

    const mode = modeRaw === 'local' || modeRaw === 'storage' ? modeRaw : null
    if (modeRaw && !mode)
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })

    const cleanedFolder = cleanFolder(folderRaw)
    if (!cleanedFolder)
      return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 })

    if (file.size > MAX_BYTES)
      return NextResponse.json(
        { error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` },
        { status: 413 }
      )

    const parsedResize = parseResize(typeof resizeRaw === 'string' ? resizeRaw : null)
    if (!parsedResize.ok)
      return NextResponse.json({ error: 'Invalid resize options' }, { status: 400 })
    const resize = parsedResize.value

    const isImage = (file.type || '').startsWith('image/')

    // Non-image files keep their type, so script / HTML / SVG types are refused.
    // Images are re-encoded as PNG below, so their original name does not matter.
    if (!isImage && (hasBlockedExt(file.name || '') || /html|javascript|php|svg|xml/i.test(file.type || '')))
      return NextResponse.json({ error: 'This file type is not allowed' }, { status: 400 })

    console.log('[upload-file] Upload mode:', mode)

    const folder = cleanedFolder === 'uploads' ? '' : cleanedFolder

    // Base domain used to build absolute URLs for local storage.
    // NEXT_PUBLIC_APP_DOMAIN is documented as always trailing-slash-free.
    const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? '').replace(/\/$/, '')

    let project_id: string | null = null
    let tenant_id:  string | null = null

    // 1. Resolve project/tenant from the Authorization header
    try {
      const authHeader = req.headers.get('Authorization')
      const token      = authHeader?.replace('Bearer ', '') ?? null

      if (token) {
        const adapter = getConfiguredAdapter()

        let uid: string | null = null

        const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
        uid = decoded?.uid ?? decoded?.user_id ?? decoded?.id ?? null

        if (!uid && adapter.findTokenByAccessToken) {
          const tokenRow = await adapter.findTokenByAccessToken(token)
          if (tokenRow && !tokenRow.revoked && (!tokenRow.expires_at || new Date(tokenRow.expires_at) > new Date())) {
            uid = tokenRow.uid ?? tokenRow.user_id ?? tokenRow.id ?? null
          }
        }

        if (uid) {
          const project = await adapter.findProjectByOwnerId?.(adapter.config, uid)
          project_id     = project?.id ?? project?.project_id ?? null
          tenant_id      = project?.tenant_id ?? null
        }
      }
    } catch (err: any) {
      console.warn('[upload-file] project_id/tenant_id lookup failed:', err?.message ?? err)
    }

    // 2. Single-tenant fallback: Core has exactly one project row
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

    const buffer = Buffer.from(await file.arrayBuffer())

    let processed: Buffer = buffer

    if (isImage) {
      try {
        processed = resize
          ? await sharp(buffer)
              .resize({
                width:              resize.width,
                height:             resize.height,
                fit:                resize.fit ?? 'inside',
                withoutEnlargement: true,
              })
              .png({ compressionLevel: 9 })
              .toBuffer()
          : await sharp(buffer)
              .png({ compressionLevel: 9 })
              .toBuffer()
      } catch {
        // The file says it is an image but it cannot be read as one.
        return NextResponse.json({ error: 'The image could not be read' }, { status: 400 })
      }
    }

    // Extension: png for images, otherwise letters and digits only.
    const rawExt = (path.extname(file.name || '') || '').replace('.', '').toLowerCase()
    const ext    = isImage ? 'png' : (/^[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : '')

    const baseName = path
      .basename(file.name || 'file', path.extname(file.name || ''))
      .replace(/[^a-z0-9_-]/gi, '_')
      .toLowerCase() || 'file'

    const filename = ext ? `${baseName}.${ext}` : baseName
    const mimeType = isImage
      ? 'image/png'
      : (/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(file.type || '') ? file.type : 'application/octet-stream')

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

        console.log('[upload-file] Metadata saved successfully')
      } catch (err: any) {
        console.warn('[upload-file] Metadata save failed:', err?.message ?? err)
      }
    }

    if (mode === 'storage') {
      const dbType = process.env.NEXT_PUBLIC_DB_TYPE

      if (dbType === 'firebase' || dbType === 'supabase') {
        const adapter = getConfiguredAdapter()

        if (!adapter.uploadFile)
          return NextResponse.json(
            { error: 'File upload is not supported by the current storage adapter' },
            { status: 400 }
          )

        // Cloud adapters already return a full public URL — no domain prefix needed.
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

      const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads')
      const dirPath     = folder ? resolveInside(uploadsRoot, folder) : uploadsRoot
      const filePath    = path.join(dirPath, filename)

      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
      fs.writeFileSync(filePath, processed)

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

    const publicRoot = path.resolve(process.cwd(), 'public')
    const dirPath    = resolveInside(publicRoot, cleanedFolder)
    const filePath   = path.join(dirPath, filename)

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, processed)

    const relativeUrl = `/${cleanedFolder}/${filename}`
    const url         = appDomain ? `${appDomain}${relativeUrl}` : relativeUrl
    console.log('[upload-file] Local upload saved:', url)

    return NextResponse.json({
      success:  true,
      url,
      name:     filename,
      size:     sizeLabel,
      folder:   cleanedFolder,
      mimeType,
    })

  } catch (err: any) {
    console.error('[upload-file] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}