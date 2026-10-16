// File: app/api-public/v1/[project]/auth/signup/route.ts

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { validateCoreApiKey } from '@/app/lib/coreApiAuth'
import { coreCors, safeCustomer, issueCoreCustomerToken, verifyAccessToken } from '@/app/lib/customerAuthCore'
import { clientIp, rateLimit } from '@/app/lib/rateLimit'

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

  const email     = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase()
  const password  = typeof body.password === 'string' ? body.password : ''
  const full_name = (typeof body.full_name === 'string' ? body.full_name : '').trim().slice(0, 200) || null

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: coreCors() })
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400, headers: coreCors() })
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be 8 to 128 characters' }, { status: 400, headers: coreCors() })
  }

  // 10 sign-ups per hour per IP.
  const rl = rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { ...coreCors(), 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  // FIX: findUserByEmail matches purely on user_email across all 5
  // adapters, with no is_anonymous/user_type filtering - every anonymous
  // account shares the placeholder '-' but real emails are checked here,
  // so a genuine match must still be rejected as "available" if it turns
  // out to be an anonymous row (defensive; shouldn't happen for a real
  // email, but costs nothing to guard).
  const existing = await (adapter as any).findUserByEmail(dbConfig, email)
  if (existing && !existing.is_anonymous) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409, headers: coreCors() })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const now = new Date()

  // NEW: if the request carries a valid, currently-anonymous customer
  // token, upgrade that SAME nxf_users row in place instead of creating a
  // new one - user_id never changes, so anything already tied to it stays
  // theirs. Everyone starts anonymous per the app's first-launch flow, so
  // this is the normal path; a signup with no anonymous token (or an
  // invalid/expired one) falls through to a plain new-row insert below.
  // NOTE: this used the hosted-only readAllAdmin(), which Core's adapters do
  // not implement, so the lookup always threw and silently fell through to a
  // brand-new account. It now uses readAll(), so anonymous accounts really are
  // upgraded in place.
  const customerToken = req.headers.get('x-customer-token') ?? ''
  let anonymousUserId: string | null = null

  if (customerToken) {
    try {
      const decoded: any = verifyAccessToken(customerToken)   // customer tokens only
      {
        const tokenRows: any[] = await (adapter as any).readAll(dbConfig, 'nxf_system_tokens')
        const tokenRow = (tokenRows ?? []).find((t: any) => t.access_token === customerToken)

        if (tokenRow && !tokenRow.revoked) {
          const userId = decoded.sub ?? decoded.user_id
          const users: any[] = await (adapter as any).read(dbConfig, 'nxf_users', { user_id: userId })
          const existingUser = users?.[0]

          if (existingUser?.is_anonymous) {
            anonymousUserId = existingUser.user_id
          }
        }
      }
    } catch {
      // Invalid/expired token - fall through to a normal, brand-new signup.
    }
  }

  if (anonymousUserId) {
    // 'user_id' tells the adapter which column identifies the row
    // (the default is 'id', which nxf_users does not have).
    await (adapter as any).update(dbConfig, 'nxf_users', anonymousUserId, {
      user_email:     email,
      password_hash,
      full_name,
      is_anonymous:   false,
      email_verified: false,
      is_logged_in:   true,
      last_login:     now,
      updated_at:     now,
    }, 'user_id')

    const { token, refreshToken } = await issueCoreCustomerToken({
      userId: anonymousUserId, tenantId: auth.tenantId, projectId: auth.projectId,
    })

    const users: any[] = await (adapter as any).read(dbConfig, 'nxf_users', { user_id: anonymousUserId })
    const upgraded = users?.[0]

    return NextResponse.json(
      { user: safeCustomer(upgraded), token, refreshToken },
      { status: 200, headers: coreCors() },
    )
  }

  const user_id = crypto.randomUUID()

  // Direct insert - NOT registerUser (that creates tenant+project for admins).
  await (adapter as any).create(dbConfig, 'nxf_users', {
    user_id,
    user_email:     email,
    password_hash,
    full_name,
    role:           'user',
    user_type:      'customer',
    status:         'active',
    email_verified: false,
    is_anonymous:   false,
    is_logged_in:   true,
    last_login:     now,
    created_at:     now,
    updated_at:     now,
  })

  const { token, refreshToken } = await issueCoreCustomerToken({
    userId: user_id, tenantId: auth.tenantId, projectId: auth.projectId,
  })

  const created = await (adapter as any).findUserByEmail(dbConfig, email)
  return NextResponse.json(
    { user: safeCustomer(created), token, refreshToken },
    { status: 201, headers: coreCors() },
  )
}