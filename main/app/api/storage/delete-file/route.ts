// app/api/storage/delete-file/route.ts
/**
 * DELETE /api/storage/delete-file
 * Body: { folder: string, fileName: string }
 *
 * Deletes the file from storage (critical) and its nxf_storage row
 * (the adapter also does this; the second call is a best-effort safety net).
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function DELETE(req: NextRequest) {
  try {
    const { folder, fileName } = await req.json()

    if (!folder || !fileName) {
      console.warn('[delete-file] Missing field:', { folder, fileName })
      return NextResponse.json(
        { error: 'folder and fileName are required', received: { folder, fileName } },
        { status: 400 }
      )
    }

    const adapter = getConfiguredAdapter()

    if (!adapter.deleteFile)
      return NextResponse.json({ error: 'deleteFile not supported' }, { status: 400 })

    await adapter.deleteFile(folder, fileName)
    console.log('[delete-file] File deleted from storage successfully')

    try {
      const filePath = `${folder}/${fileName}`
      if (adapter.deleteStorageRecordByFilePath) {
        await adapter.deleteStorageRecordByFilePath(filePath)
      }
    } catch (dbErr: any) {
      console.warn('[delete-file] nxf_storage metadata cleanup failed (non-critical):', dbErr.message)
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[delete-file] Unhandled error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}