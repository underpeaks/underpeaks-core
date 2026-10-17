// app/api/storage/list-folders/route.ts
import 'server-only'

/**
 * GET /api/storage/list-folders
 * Returns { folders: { name, count }[] } through the configured adapter.
 * Plain folder names from the adapter get a file count added; if counting one
 * folder fails, its count is 0. If the adapter cannot list folders, returns
 * { folders: [] }.
 *
 * SECURITY (Oct 2026): signed-in console user required; 500 responses are
 * generic.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

export async function GET(req: NextRequest) {
  const auth = await requireSessionUser(req)
  if (!auth.ok) return auth.response

  try {
    const adapter = getConfiguredAdapter()

    if (!adapter.listFolders) return NextResponse.json({ folders: [] })

    const folders = await adapter.listFolders()

    if (folders.length === 0) return NextResponse.json({ folders: [] })

    // The adapter already returned { name, count } objects: pass them through.
    if (typeof folders[0] === 'object') return NextResponse.json({ folders })

    // Plain names: add a file count to each, in parallel.
    const enriched = await Promise.all(
      (folders as unknown as string[]).map(async (name) => {
        try {
          const files = adapter.listFiles ? await adapter.listFiles(name) : []
          return { name, count: files.length }
        } catch {
          return { name, count: 0 }
        }
      })
    )

    return NextResponse.json({ folders: enriched })

  } catch (err: any) {
    console.error('[list-folders] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}