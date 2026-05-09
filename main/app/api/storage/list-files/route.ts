import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function GET(req: NextRequest) {
  try {
    const folder = req.nextUrl.searchParams.get('folder')
    if (!folder)
      return NextResponse.json({ error: 'folder is required' }, { status: 400 })

    const adapter = getStorageAdapter()
    if (!adapter.listFiles)
      return NextResponse.json({ files: [] })

    const files = await adapter.listFiles(folder)
    return NextResponse.json({ files })
  } catch (err: any) {
    console.error('[list-files]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}