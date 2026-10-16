// File: app/api-public/v1/[project]/auth/reset-password/route.ts
//
// POST { token, password } - finishes a CUSTOMER password reset.
//
// The token comes from /auth/forgot-password (emailed to the customer). It is
// the credential, so no API key is demanded here (apps call this from a reset
// screen opened from an email). What changed:
//  - Customer accounts only. Before, this ran the console's reset logic, so a
//    token belonging to an admin or any other account type would have worked.
//  - Anonymous accounts are refused.
//  - An expired token is refused. The expiry is read from the token itself
//    (<hex>.<expiry ms in base36>), not from a database column, so it does not
//    depend on how the database stores times or on the server's time zone.
//  - Rate limited, and the password must be 8 to 128 characters.
//  - Errors are generic; no internal messages leave the server.
// The adapter hashes the plain password itself - never in the route.

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { coreCors } from '@/app/lib/customerAuthCore'
import { clientIp, rateLimit } from '@/app/lib/rateLimit'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: coreCors() })
}

const BAD_TOKEN = { error: 'Invalid or expired token' }

// A token without a readable expiry is treated as expired.
function tokenExpired(token: string): boolean {
  const dot = token.lastIndexOf('.')
  if (dot < 0) return true
  const expiresAt = parseInt(token.slice(dot + 1), 36)
  if (!Number.isFinite(expiresAt)) return true
  return expiresAt < Date.now()
}

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: coreCors() })
  }

  const token    = typeof body?.token === 'string' ? body.token.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400, headers: coreCors() })
  }
  if (token.length > 256) {
    return NextResponse.json(BAD_TOKEN, { status: 400, headers: coreCors() })
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be 8 to 128 characters' }, { status: 400, headers: coreCors() })
  }

  // 10 attempts per hour per IP: tokens are 64 random hex characters, but there
  // is no reason to let anyone guess at them.
  const rl = rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { ...coreCors(), 'Retry-After': String(rl.retryAfter) } },
    )
  }

  // Cheap check first: no database lookup for an expired or malformed token.
  if (tokenExpired(token)) {
    return NextResponse.json(BAD_TOKEN, { status: 400, headers: coreCors() })
  }

  try {
    const adapter = getConfiguredAdapter()
    const dbType  = adapter.config.type

    // Firebase and Supabase customers do not use this token flow.
    if (dbType === 'firebase' || dbType === 'supabase') {
      return NextResponse.json(
        { error: 'Password reset is not available through this endpoint' },
        { status: 400, headers: coreCors() },
      )
    }

    if (!adapter.findUserByToken || !adapter.updatePasswordByToken) {
      console.error(`[api-public reset-password] ${dbType} adapter is missing token methods`)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: coreCors() })
    }

    const user: any = await adapter.findUserByToken(token)

    if (!user || user.user_type !== 'customer' || user.is_anonymous) {
      return NextResponse.json(BAD_TOKEN, { status: 400, headers: coreCors() })
    }

    await adapter.updatePasswordByToken(token, password)

    return NextResponse.json({ success: true }, { headers: coreCors() })
  } catch (err: any) {
    console.error('[api-public reset-password] failed:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: coreCors() })
  }
}