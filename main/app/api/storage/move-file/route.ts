// app/api/storage/move-file/route.ts
import 'server-only'

/**
 * POST /api/storage/move-file
 * Body: { fromFolder: string, toFolder: string, fileName: string }
 * Moves a single file between storage folders via the configured adapter.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

export async function POST(req: NextRequest) {
  try {
    const { fromFolder, toFolder, fileName } = await req.json()

    if (!fromFolder || !toFolder || !fileName) {
      console.warn('[move-file] Missing field:', { fromFolder, toFolder, fileName })
      return NextResponse.json(
        {
          error: 'fromFolder, toFolder, and fileName are all required',
          received: { fromFolder, toFolder, fileName },
        },
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
    console.error('[move-file] Unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}