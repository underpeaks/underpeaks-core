// app/api/storage/delete-file/route.ts
/**
 * DELETE /api/storage/delete-file
 * Body: { folder: string, fileName: string }
 *
 * Deletes the file from storage (critical) and its nxf_storage row
 * (the adapter also does this; the second call is a best-effort safety net).
 *
 * Hardening (Oct 2026):
 *  - Console users only (signed in). Before, anyone could delete files.
 *  - folder and fileName must be plain strings; fileName cannot contain a
 *    path separator and neither value can contain "..".
 *  - 500 responses no longer return internal error messages.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

function unsafeSegment(value: string): boolean {
  return value.includes('..') || value.includes('\0') || value.includes('\\')
}

export async function DELETE(req: NextRequest) {
  const session = await requireSessionUser(req)
  if (!session.ok) return session.response

  try {
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const folder   = typeof body?.folder   === 'string' ? body.folder.trim()   : ''
    const fileName = typeof body?.fileName === 'string' ? body.fileName.trim() : ''

    if (!folder || !fileName) {
      return NextResponse.json({ error: 'folder and fileName are required' }, { status: 400 })
    }
    if (
      folder.length > 300 || fileName.length > 300 ||
      unsafeSegment(folder) || unsafeSegment(fileName) || fileName.includes('/')
    ) {
      return NextResponse.json({ error: 'Invalid folder or file name' }, { status: 400 })
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
      console.warn('[delete-file] nxf_storage metadata cleanup failed (non-critical):', dbErr?.message)
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[delete-file] Unhandled error:', err?.message)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}