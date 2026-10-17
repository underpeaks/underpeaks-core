// app/api/storage/delete-folder/route.ts
import 'server-only'

/**
 * DELETE /api/storage/delete-folder
 * Body: { folder: string }
 *
 * Deletes a folder and EVERYTHING in it, through the configured adapter.
 * Destructive and recursive: confirm with the user in the UI first.
 *
 * SECURITY (Oct 2026): signed-in console user required; the folder must be
 * a plain string path with no "..", ".", backslash or null byte (it goes
 * into file paths and bucket prefixes, so these could reach outside the
 * storage folder); 500 responses are generic.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

/** A folder path: string, <= 300 chars, no "..", ".", backslash or null byte. */
function validFolder(v: unknown): v is string {
  if (typeof v !== 'string' || !v.trim() || v.length > 300) return false
  if (v.includes('\\') || v.includes('\0')) return false
  // Reject "/" and similar that would mean "the whole bucket".
  if (!v.split('/').some((seg) => seg.length > 0)) return false
  return !v.split('/').some((seg) => seg === '..' || seg === '.')
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSessionUser(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => null)
    const folder = body?.folder

    if (!validFolder(folder)) {
      return NextResponse.json({ error: 'A valid folder is required' }, { status: 400 })
    }

    const adapter = getConfiguredAdapter()

    if (!adapter.deleteFolder) {
      return NextResponse.json({ error: 'deleteFolder not supported' }, { status: 400 })
    }

    await adapter.deleteFolder(folder)
    console.log('[delete-folder] Folder deleted from storage successfully')

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[delete-folder] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}