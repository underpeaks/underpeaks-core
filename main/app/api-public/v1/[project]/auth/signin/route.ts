// File: D:\NXTFLUTTER_CORE\underpeaks-core\main\app\api-public\v1\[project]\auth\signin\route.ts

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
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

  const email    = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400, headers: coreCors() })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const user = await (adapter as any).findUserByEmail(dbConfig, email)

  // Must be a customer — never let an admin row sign in through the app.
  if (!user || user.user_type !== 'customer' || !user.password_hash) {
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
  await (adapter as any).update(dbConfig, 'nxf_users', user.user_id, {
    is_logged_in: true, last_login: now, updated_at: now,
  })

  const { token, refreshToken } = await issueCoreCustomerToken({
    userId: user.user_id, tenantId: auth.tenantId, projectId: auth.projectId,
  })

  return NextResponse.json(
    { user: safeCustomer(user), token, refreshToken },
    { headers: coreCors() },
  )
}