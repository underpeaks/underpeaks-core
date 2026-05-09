import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { folder, url } = await req.json()
    if (!folder || !url)
      return NextResponse.json({ error: 'folder and url are required' }, { status: 400 })

    // ── Resolve project_id from auth token ─────────────────────────────────
    let project_id: string | null = null

    try {
      const authHeader = req.headers.get('Authorization')
      const token      = authHeader?.replace('Bearer ', '') ?? null

      if (token) {
        const adapter = getStorageAdapter()

        const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
        const uid     = decoded?.uid ?? decoded?.user_id ?? null

        if (uid) {
          const project = await adapter.findProjectByOwnerId?.(adapter.config, uid)
          project_id    = project?.id ?? project?.project_id ?? null
          console.log('[import-url] resolved project_id:', project_id)
        }
      }
    } catch (err: any) {
      console.warn('[import-url] project_id lookup failed:', err.message)
    }

    const adapter = getStorageAdapter()
    if (!adapter.importFromUrl)
      return NextResponse.json({ error: 'importFromUrl not supported' }, { status: 400 })

    const file = await adapter.importFromUrl(folder, url)

    // ── Save metadata to nxf_storage ───────────────────────────────────────
    try {
      if (adapter.create) {
        await adapter.create(adapter.config, 'nxf_storage', {
          storage_id: uuidv4(),
          project_id: project_id ?? null,
          folder,
          file_name:  file.name,
          file_path:  file.folderPath,
          url:        file.url,
          mime_type:  file.mimeType,
          size:       parseInt(file.size) || 0,
          created_at: new Date().toISOString(),
        })
        console.log('[import-url] metadata saved to nxf_storage')
      }
    } catch (dbErr: any) {
      console.warn('[import-url] metadata save failed:', dbErr.message)
    }

    return NextResponse.json({ success: true, file })
  } catch (err: any) {
    console.error('[import-url]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}