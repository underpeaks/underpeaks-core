import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const file      = formData.get('file')   as File   | null
    const folder    = formData.get('folder') as string | null
    const resizeRaw = formData.get('resize') as string | null
    const mode      = formData.get('mode')   as 'local' | 'storage' | null

    console.log('[upload-file] mode:', mode)

    if (!file || !folder)
      return NextResponse.json({ error: 'File and folder are required' }, { status: 400 })

    // ── Resolve project_id server-side from auth token ─────────────────────
    let project_id: string | null = null

    try {
      const authHeader = req.headers.get('Authorization')
      const token      = authHeader?.replace('Bearer ', '') ?? null

      if (token) {
        const adapter = getStorageAdapter()

        const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
        console.log('[upload-file] decoded token:', decoded)

        const uid = decoded?.uid ?? decoded?.user_id ?? null
        console.log('[upload-file] uid:', uid)

        if (uid) {
          const project = await adapter.findProjectByOwnerId?.(adapter.config, uid)
          console.log('[upload-file] project lookup result:', project)
          project_id = project?.id ?? project?.project_id ?? null
          console.log('[upload-file] resolved project_id:', project_id)
        }
      }
    } catch (err: any) {
      console.warn('[upload-file] project_id lookup failed:', err.message)
    }

    const buffer  = Buffer.from(await file.arrayBuffer())
    const isImage = file.type.startsWith('image/')
    const resize  = resizeRaw ? JSON.parse(resizeRaw) : null

    let processed: Buffer = buffer

    if (isImage && resize) {
      processed = await sharp(buffer)
        .resize({
          width:              resize.width,
          height:             resize.height,
          fit:                resize.fit ?? 'inside',
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9 })
        .toBuffer()
    } else if (isImage) {
      processed = await sharp(buffer)
        .png({ compressionLevel: 9 })
        .toBuffer()
    }

    // ── Build safe filename ────────────────────────────────────────────────
    const ext      = isImage
      ? 'png'
      : (path.extname(file.name) || '').replace('.', '')
    const baseName = path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-z0-9_-]/gi, '_')
      .toLowerCase()
    const filename = ext ? `${baseName}.${ext}` : baseName
    const mimeType = isImage ? 'image/png' : file.type

    const sizeLabel = processed.length > 1024 * 1024
      ? `${(processed.length / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(processed.length / 1024)} KB`

    // ── Helper — save metadata to nxf_storage ─────────────────────────────
    const saveMetadata = async (url: string, filePath: string) => {
      try {
        const adapter = getStorageAdapter()
        if (!adapter.create) return

        await adapter.create(adapter.config, 'nxf_storage', {
          storage_id: uuidv4(),
          project_id: project_id ?? null,
          folder,
          file_name:  filename,
          file_path:  filePath,
          url,
          mime_type:  mimeType,
          size:       processed.length,
          created_at: new Date().toISOString(),
        })

        console.log('[upload-file] metadata saved to nxf_storage')
      } catch (dbErr: any) {
        console.warn('[upload-file] metadata save failed:', dbErr.message)
      }
    }

    // ── Storage mode (media page) ──────────────────────────────────────────
    if (mode === 'storage') {
      const dbType = process.env.NEXT_PUBLIC_DB_TYPE

      // Firebase / Supabase — upload to cloud storage + save metadata
      if (dbType === 'firebase' || dbType === 'supabase') {
        const adapter = getStorageAdapter()

        if (!adapter.uploadFile)
          return NextResponse.json({ error: 'uploadFile not supported' }, { status: 400 })

        const url      = await adapter.uploadFile(folder, filename, processed, mimeType)
        const filePath = `${folder}/${filename}`

        await saveMetadata(url, filePath)

        return NextResponse.json({
          success:  true,
          url,
          name:     filename,
          size:     sizeLabel,
          folder,
          mimeType,
        })
      }

      // MongoDB / MySQL / Postgres — save locally + save metadata
      const dirPath  = path.resolve(process.cwd(), 'public', 'uploads', folder)
      const filePath = path.join(dirPath, filename)

      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
      fs.writeFileSync(filePath, processed)

      const url = `/uploads/${folder}/${filename}`

      await saveMetadata(url, `/uploads/${folder}/${filename}`)

      return NextResponse.json({
        success:  true,
        url,
        name:     filename,
        size:     sizeLabel,
        folder,
        mimeType,
      })
    }

    // ── Local mode (branding) — no metadata saved ──────────────────────────
    const dirPath  = path.resolve(process.cwd(), 'public', folder)
    const filePath = path.join(dirPath, filename)

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, processed)

    const url = `/${folder}/${filename}`
    console.log(`✅ [upload-file] local ${url} (${processed.length} bytes)`)

    return NextResponse.json({
      success:  true,
      url,
      name:     filename,
      size:     sizeLabel,
      folder,
      mimeType,
    })

  } catch (err: any) {
    console.error('[upload-file ERROR]', err)
    return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 })
  }
}