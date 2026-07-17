// File: D:\NXTFLUTTER_CORE\underpeaks-core\main\app\api-public\v1\[project]\auth\signup\route.ts

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import { validateCoreApiKey } from '@/app/lib/coreApiAuth'
import { coreCors, safeCustomer, issueCoreCustomerToken } from '@/app/lib/customerAuthCore'

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

  const email     = (body.email ?? '').trim().toLowerCase()
  const password  = body.password ?? ''
  const full_name = (body.full_name ?? '').trim() || null

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: coreCors() })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const existing = await (adapter as any).findUserByEmail(dbConfig, email)
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409, headers: coreCors() })
  }

  const password_hash = await bcrypt.hash(password, 10)
  const user_id = crypto.randomUUID()
  const now = new Date()

  // Direct insert — NOT registerUser (that creates tenant+project for admins).
  await (adapter as any).create(dbConfig, 'nxf_users', {
    user_id,
    user_email:     email,
    password_hash,
    full_name,
    role:           'user',
    user_type:      'customer',
    status:         'active',
    email_verified: false,
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