import 'server-only'
import { NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function GET() {
  try {
    const adapter = getStorageAdapter()
    if (!adapter.listFolders)
      return NextResponse.json({ folders: [] })

    const folders = await adapter.listFolders()

    // If adapter returns strings, fetch counts for each folder
    // If adapter returns objects with counts already, use them directly
    if (folders.length === 0)
      return NextResponse.json({ folders: [] })

    // Check if already enriched objects or plain strings
    const isEnriched = typeof folders[0] === 'object'

    if (isEnriched) {
      return NextResponse.json({ folders })
    }

    // Plain strings — enrich with counts
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

    console.log('[list-folders] enriched:', enriched)
    return NextResponse.json({ folders: enriched })

  } catch (err: any) {
    console.error('[list-folders]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}