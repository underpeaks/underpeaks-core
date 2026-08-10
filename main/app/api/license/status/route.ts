//app/api/license/status/route.ts
import 'server-only'
import { NextResponse } from 'next/server'

export async function GET() {
  const hasKey = !!process.env.NXF_LICENSE_KEY?.trim()
  return NextResponse.json({ hasKey })
}