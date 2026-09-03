// File: D:\NXTFLUTTER_CORE\underpeaks-core\main\app\api-public\v1\[project]\auth\anonymous\route.ts

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { validateCoreApiKey } from '@/app/lib/coreApiAuth'
import { coreCors, safeCustomer, issueCoreCustomerToken } from '@/app/lib/customerAuthCore'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: coreCors() })
}

// Same purpose as hosted's /auth/anonymous — every user gets a real
// nxf_users row and a working token on first app launch, before any real
// sign-up. user_email/password_hash use the literal placeholder '-' (per
// Anton's call, matching hosted) rather than a schema migration to make
// those columns nullable. Every anonymous row shares that same
// placeholder, and none of the 5 adapters' findUserByEmail() filter on
// is_anonymous — so signin/signup here (and hosted) must explicitly
// reject any row where is_anonymous is true, rather than relying on the
// lookup itself to exclude them.
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? ''
  const auth = await validateCoreApiKey(apiKey)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: coreCors() })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const user_id = crypto.randomUUID()
  const now = new Date()
  const password_hash = await bcrypt.hash('-', 10)

  await (adapter as any).create(dbConfig, 'nxf_users', {
    user_id,
    user_email:     '-',
    password_hash,
    full_name:      null,
    role:           'user',
    user_type:      'customer',
    status:         'active',
    email_verified: false,
    is_anonymous:   true,
    is_logged_in:   true,
    last_login:     now,
    created_at:     now,
    updated_at:     now,
  })

  const { token, refreshToken } = await issueCoreCustomerToken({
    userId: user_id, tenantId: auth.tenantId, projectId: auth.projectId,
  })

  const users: any[] = await (adapter as any).read(dbConfig, 'nxf_users', { user_id })
  const created = users?.[0]

  if (!created) {
    return NextResponse.json({ error: 'Could not create anonymous session' }, { status: 500, headers: coreCors() })
  }

  return NextResponse.json(
    { user: safeCustomer(created), token, refreshToken },
    { status: 201, headers: coreCors() },
  )
}