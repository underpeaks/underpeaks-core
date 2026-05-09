import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function DELETE(req: NextRequest) {
  try {
    const { folder, fileName } = await req.json()
    console.log('[delete-file] folder:', folder, '| fileName:', fileName)

    if (!folder || !fileName)
      return NextResponse.json({ error: 'folder and fileName are required' }, { status: 400 })

    const adapter = getStorageAdapter()
    console.log('[delete-file] adapter type:', adapter?.constructor?.name)
    console.log('[delete-file] deleteFile supported:', !!adapter.deleteFile)
    console.log('[delete-file] deleteStorageRecordByFilePath supported:', !!adapter.deleteStorageRecordByFilePath)

    if (!adapter.deleteFile)
      return NextResponse.json({ error: 'deleteFile not supported' }, { status: 400 })

    // ── Delete from storage ────────────────────────────────────────────────
    console.log('[delete-file] calling deleteFile...')
    await adapter.deleteFile(folder, fileName)
    console.log('[delete-file] deleteFile SUCCESS')

    // ── Delete metadata from nxf_storage ──────────────────────────────────
    try {
      const filePath = `${folder}/${fileName}`
      console.log('[delete-file] filePath for metadata lookup:', filePath)

      if (!adapter.deleteStorageRecordByFilePath) {
        console.warn('[delete-file] deleteStorageRecordByFilePath not implemented on adapter')
      } else {
        console.log('[delete-file] calling deleteStorageRecordByFilePath...')
        await adapter.deleteStorageRecordByFilePath(filePath)
        console.log('[delete-file] nxf_storage cleanup SUCCESS')
      }
    } catch (dbErr: any) {
      console.warn('[delete-file] nxf_storage cleanup FAILED:', dbErr.message)
      console.warn('[delete-file] cleanup error stack:', dbErr.stack)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[delete-file] OUTER ERROR:', err.message)
    console.error('[delete-file] OUTER STACK:', err.stack)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}