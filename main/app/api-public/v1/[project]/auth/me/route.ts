// File: D:\NXTFLUTTER_CORE\NXTFlutter_Core\main\app\api-public\v1\[project]\auth\me\route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '
import { validateCoreApiKey } from '@/app/lib/coreApiAuth'
import { coreCors, safeCustomer, verifyAccessToken } from '@/app/lib/customerAuthCore'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: coreCors() })
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? ''
  const auth = await validateCoreApiKey(apiKey)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status, headers: coreCors() })
  }

  const customerToken = req.headers.get('x-customer-token') ?? ''
  if (!customerToken) {
    return NextResponse.json({ error: 'Missing customer token' }, { status: 401, headers: coreCors() })
  }

  let decoded: any
  try {
    decoded = verifyAccessToken(customerToken)
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401, headers: coreCors() })
  }

  if (decoded?.user_type !== 'customer') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: coreCors() })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  // Confirm token not revoked.
  const tokenRows: any[] = await (adapter as any).readAllAdmin(dbConfig, 'nxf_system_tokens')
  const tokenRow = (tokenRows ?? []).find((t: any) => t.access_token === customerToken)
  if (!tokenRow || tokenRow.revoked) {
    return NextResponse.json({ error: 'Session revoked' }, { status: 401, headers: coreCors() })
  }

  const userId = decoded.sub ?? decoded.user_id
  const users: any[] = await (adapter as any).read(dbConfig, 'nxf_users', { user_id: userId })
  const user = users?.[0]

  if (!user || user.user_type !== 'customer') {
    return NextResponse.json({ error: 'User not found' }, { status: 404, headers: coreCors() })
  }

  return NextResponse.json({ user: safeCustomer(user) }, { headers: coreCors() })
}