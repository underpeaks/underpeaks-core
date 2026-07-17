// File: D:\NXTFLUTTER_CORE\underpeaks-core\main\app\api-public\v1\[project]\auth\reset-password\route.ts

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import { validateCoreApiKey } from '@/app/lib/coreApiAuth'
import { coreCors } from '@/app/lib/customerAuthCore'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: coreCors() })
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? ''
  const auth = await validateCoreApiKey(apiKey)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: coreCors() })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: coreCors() })
  }

  const token       = body.token ?? ''
  const newPassword = body.password ?? ''
  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400, headers: coreCors() })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  // findUserByToken checks token_ttl > NOW() (from the adapter you pasted).
  const user = await (adapter as any).findUserByToken(token)

  if (!user || user.user_type !== 'customer') {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400, headers: coreCors() })
  }

  const password_hash = await bcrypt.hash(newPassword, 10)
  await (adapter as any).update(dbConfig, 'nxf_users', user.user_id, {
    password_hash, token: null, token_ttl: null, updated_at: new Date(),
  })

  return NextResponse.json({ success: true }, { headers: coreCors() })
}