// app/api/storage/move-file/route.ts
import 'server-only'

/**
 * POST /api/storage/move-file
 * Body: { fromFolder: string, toFolder: string, fileName: string }
 * Moves one file between storage folders through the configured adapter.
 *
 * SECURITY (Oct 2026): signed-in console user required; folder and file
 * names must be plain strings with no path tricks ("..", backslashes,
 * null bytes); 500 responses no longer expose internal messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

/** A folder path: string, <= 300 chars, no "..", ".", backslash or null byte. */
function validFolder(v: unknown): v is string {
  if (typeof v !== 'string' || !v || v.length > 300) return false
  if (v.includes('\\') || v.includes('\0')) return false
  return !v.split('/').some((seg) => seg === '..' || seg === '.')
}

/** A file name: string, <= 255 chars, no slashes, backslash, "..", or null byte. */
function validName(v: unknown): v is string {
  if (typeof v !== 'string' || !v || v.length > 255) return false
  if (v.includes('/') || v.includes('\\') || v.includes('\0')) return false
  return v !== '.' && !v.includes('..')
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionUser(req)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => null)
    const { fromFolder, toFolder, fileName } = body ?? {}

    if (!validFolder(fromFolder) || !validFolder(toFolder) || !validName(fileName)) {
      return NextResponse.json(
        { error: 'fromFolder, toFolder, and fileName are all required and must be valid' },
        { status: 400 }
      )
    }

    const adapter = getConfiguredAdapter()

    if (!adapter.moveFile) {
      return NextResponse.json(
        { error: 'File move is not supported by the current storage adapter' },
        { status: 400 }
      )
    }

    await adapter.moveFile(fromFolder, toFolder, fileName)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[move-file] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}