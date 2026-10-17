// app/api/storage/create-folder/route.ts
import 'server-only'

/**
 * POST /api/storage/create-folder
 * Body: { folder: string }
 * Creates a folder in the configured storage through the adapter.
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
  if (typeof v !== 'string' || !v.trim() || v.length > 300) return false
  if (v.includes('\\') || v.includes('\0')) return false
  if (!v.split('/').some((seg) => seg.length > 0)) return false
  return !v.split('/').some((seg) => seg === '..' || seg === '.')
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionUser(req)
  if (!auth.ok) return auth.response

  try {
    const body   = await req.json().catch(() => null)
    const folder = body?.folder

    if (!validFolder(folder)) {
      return NextResponse.json({ error: 'A valid folder is required' }, { status: 400 })
    }

    const adapter = getConfiguredAdapter()

    if (!adapter.createFolder) {
      return NextResponse.json({ error: 'createFolder not supported' }, { status: 400 })
    }

    await adapter.createFolder(folder)

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[create-folder] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}