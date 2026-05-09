import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function POST(req: NextRequest) {
  try {
    const { folder } = await req.json()
    if (!folder)
      return NextResponse.json({ error: 'folder is required' }, { status: 400 })

    const adapter = getStorageAdapter()
    if (!adapter.createFolder)
      return NextResponse.json({ error: 'createFolder not supported' }, { status: 400 })

    await adapter.createFolder(folder)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[create-folder]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}