import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function POST(req: NextRequest) {
  try {
    console.log("RENAME API REACHED");
    const { folder, oldName, newName } = await req.json()
console.log("RENAME API REACHED CHECK 1 ");
    if (!folder || !oldName || !newName)
      return NextResponse.json({ error: 'folder, oldName and newName are required' }, { status: 400 })
console.log("RENAME API REACHED - ADAPTER REACHED ");

    const adapter = getStorageAdapter()
    console.log('[rename-file] adapter constructor:', adapter?.constructor?.name)
console.log('[rename-file] renameFile exists:', typeof adapter.renameFile)
    if (!adapter.renameFile)
      return NextResponse.json({ error: 'renameFile not supported' }, { status: 400 })
console.log("RENAME API REACHED - RENAME REACHED ");

    await adapter.renameFile(folder, oldName, newName)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[rename-file]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}