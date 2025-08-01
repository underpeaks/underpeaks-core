// /app/api/test-db-connection/route.ts

import { NextResponse } from 'next/server'
import { getAdapter } from '@/app/db-adapter'
import type { DBConfig } from '@/app/db-adapter/types'

export async function POST(req: Request) {
  try {
    const config: DBConfig = await req.json()
    const adapter = getAdapter(config.type, config)
    const result = await adapter.testConnection(config)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
