//app/api/storage/upload-file/route.ts
import 'server-only'

import { NextRequest, NextResponse } from 'next/server'
import fs                            from 'fs'
import path                          from 'path'
import sharp                         from 'sharp'
import { v4 as uuidv4 }              from 'uuid'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData()
    const file      = formData.get('file')   as File   | null
    const folderRaw = formData.get('folder') as string | null
    const resizeRaw = formData.get('resize') as string | null
    const mode      = formData.get('mode')   as 'local' | 'storage' | null

    console.log('[upload-file] Upload mode:', mode)

    if (!file || !folderRaw)
      return NextResponse.json(
        { error: 'file and folder are required' },
        { status: 400 }
      )

    const folder = folderRaw === 'uploads' ? '' : folderRaw

    // Base domain used to build absolute URLs for local storage — the route
    // previously returned a relative path like "/uploads/x.png", which works
    // fine for <img src> in-app but is useless when copied/pasted anywhere
    // else. NEXT_PUBLIC_APP_DOMAIN is documented as always trailing-slash-free.
    const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? '').replace(/\/$/, '')

    let project_id: string | null = null
    let tenant_id:  string | null = null

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

    const ext = isImage
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

      const dirPath  = folder
        ? path.resolve(process.cwd(), 'public', 'uploads', folder)
        : path.resolve(process.cwd(), 'public', 'uploads')
      const filePath = path.join(dirPath, filename)

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

    const dirPath  = path.resolve(process.cwd(), 'public', folderRaw)
    const filePath = path.join(dirPath, filename)

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, processed)

    const relativeUrl = `/${folderRaw}/${filename}`
    const url         = appDomain ? `${appDomain}${relativeUrl}` : relativeUrl
    console.log('[upload-file] Local upload saved:', url)

    return NextResponse.json({
      success:  true,
      url,
      name:     filename,
      size:     sizeLabel,
      folder:   folderRaw,
      mimeType,
    })

  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}