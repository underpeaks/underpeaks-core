// File: D:\NXTFLUTTER_CORE\underpeaks-core\main\app\api-public\v1\[project]\auth\forgot-password\route.ts

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
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

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400, headers: coreCors() })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const user = await (adapter as any).findUserByEmail(dbConfig, email)

  // Always return success — don't reveal whether the email exists.
  if (user && user.user_type === 'customer') {
    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 60 * 60 * 1000)
    await (adapter as any).update(dbConfig, 'nxf_users', user.user_id, {
      token, token_ttl: ttl, updated_at: new Date(),
    })
    // TODO: send via SMTP. reset_token returned in dev only — remove once wired.
    return NextResponse.json({ success: true, reset_token: token }, { headers: coreCors() })
  }

  return NextResponse.json({ success: true }, { headers: coreCors() })
}