// File: D:\NXTFLUTTER_CORE\NXTFlutter_Core\main\app\api-public\v1\[project]\auth\signout\route.ts

import { NextRequest, NextResponse } from 'next/server'
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

  const customerToken = req.headers.get('x-customer-token') ?? ''
  if (!customerToken) {
    return NextResponse.json({ error: 'Missing customer token' }, { status: 401, headers: coreCors() })
  }

  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  // Find the token row and revoke it.
  const tokenRows: any[] = await (adapter as any).readAllAdmin(dbConfig, 'nxf_system_tokens')
  const tokenRow = (tokenRows ?? []).find((t: any) => t.access_token === customerToken)

  if (tokenRow) {
    await (adapter as any).update(dbConfig, 'nxf_system_tokens', tokenRow.token_id, {
      revoked: true, updated_at: new Date(),
    })
  }

  return NextResponse.json({ success: true }, { headers: coreCors() })
}