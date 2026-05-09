import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function DELETE(req: NextRequest) {
  try {
    const { folder } = await req.json()
    if (!folder)
      return NextResponse.json({ error: 'folder is required' }, { status: 400 })

    const adapter = getStorageAdapter()
    if (!adapter.deleteFolder)
      return NextResponse.json({ error: 'deleteFolder not supported' }, { status: 400 })

    await adapter.deleteFolder(folder)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[delete-folder]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}