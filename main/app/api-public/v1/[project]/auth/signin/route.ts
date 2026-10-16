// File: app/api-public/v1/[project]/auth/signin/route.ts

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { validateCoreApiKey } from '@/app/lib/coreApiAuth'
import { coreCors, safeCustomer, issueCoreCustomerToken } from '@/app/lib/customerAuthCore'
import { clientIp, rateLimit } from '@/app/lib/rateLimit'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: coreCors() })
}

// Brute-force protection: 10 attempts per 15 minutes for one email from one
// IP, and 60 per 15 minutes for one IP overall.
const WINDOW_MS = 15 * 60 * 1000

// Compared against when the email does not exist, so a missing account takes
// as long to answer as a wrong password (no email enumeration by timing).
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.F2pV0s7oB3o6s0yZb1uYhJ1p0O1e'

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

  const email    = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: coreCors() })
  }
  if (email.length > 254 || password.length > 1024) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers: coreCors() })
  }

  const ip   = clientIp(req)
  const rlIp = rateLimit(`signin-ip:${ip}`, 60, WINDOW_MS)
  const rlEm = rateLimit(`signin:${ip}:${email}`, 10, WINDOW_MS)
  if (!rlIp.ok || !rlEm.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { ...coreCors(), 'Retry-After': String(Math.max(rlIp.retryAfter, rlEm.retryAfter)) } },
    )
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const user = await (adapter as any).findUserByEmail(dbConfig, email)

  // FIX: findUserByEmail matches purely on user_email across all 5
  // adapters with no is_anonymous filtering - every anonymous account
  // shares the placeholder '-', so reject any anonymous match explicitly
  // rather than letting it through as if it were a real credentialed
  // account. Must be a customer - never let an admin row sign in
  // through the app either.
  if (!user || user.user_type !== 'customer' || user.is_anonymous || !user.password_hash) {
    await bcrypt.compare(password, DUMMY_HASH).catch(() => false)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers: coreCors() })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401, headers: coreCors() })
  }

  if (user.status === 'suspended' || user.status === 'inactive') {
    return NextResponse.json({ error: 'Account is not active' }, { status: 403, headers: coreCors() })
  }

  const now = new Date()
  // 'user_id' tells the adapter which column identifies the row
  // (the default is 'id', which nxf_users does not have).
  await (adapter as any).update(dbConfig, 'nxf_users', user.user_id, {
    is_logged_in: true, last_login: now, updated_at: now,
  }, 'user_id')

  const { token, refreshToken } = await issueCoreCustomerToken({
    userId: user.user_id, tenantId: auth.tenantId, projectId: auth.projectId,
  })

  return NextResponse.json(
    { user: safeCustomer(user), token, refreshToken },
    { headers: coreCors() },
  )
}