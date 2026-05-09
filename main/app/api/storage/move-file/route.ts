import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function POST(req: NextRequest) {
  try {
    const { fromFolder, toFolder, fileName } = await req.json()

    if (!fromFolder || !toFolder || !fileName)
      return NextResponse.json({ error: 'fromFolder, toFolder and fileName are required' }, { status: 400 })

    const adapter = getStorageAdapter()
    if (!adapter.moveFile)
      return NextResponse.json({ error: 'moveFile not supported' }, { status: 400 })

    await adapter.moveFile(fromFolder, toFolder, fileName)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[move-file]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}