// app/api/storage/list-files/route.ts
import 'server-only'

/**
 * GET /api/storage/list-files?folder=uploads/avatars
 * Returns { files } for one storage folder through the configured adapter.
 * If the adapter cannot list files, returns { files: [] }.
 *
 * SECURITY (Oct 2026): signed-in console user required; the folder must be a
 * plain string path with no "..", ".", backslash or null byte; 500 responses
 * are generic.
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

export async function GET(req: NextRequest) {
  const auth = await requireSessionUser(req)
  if (!auth.ok) return auth.response

  try {
    const folder = req.nextUrl.searchParams.get('folder')

    if (!validFolder(folder)) {
      return NextResponse.json(
        { error: 'A valid folder query parameter is required' },
        { status: 400 }
      )
    }

    const adapter = getConfiguredAdapter()

    if (!adapter.listFiles) return NextResponse.json({ files: [] })

    const files = await adapter.listFiles(folder)

    return NextResponse.json({ files })

  } catch (err: any) {
    console.error('[list-files] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}