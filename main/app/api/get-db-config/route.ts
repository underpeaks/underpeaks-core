// app/api/get-db-config/route.ts

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }        from '@/app/lib/getSessionUser'

function stripSecrets(config: any): any {
  if (!config || typeof config !== 'object') return config
  const out: any = { ...config }
  if (out.smtp && typeof out.smtp === 'object') {
    const { password_encrypted, password, ...rest } = out.smtp
    out.smtp = rest
  }
  delete out.smtp_password_encrypted
  delete out.password_encrypted
  return out
}

export async function GET(req: NextRequest) {
  try {
    // The user comes from the Bearer token, never from the query string.
    const session = await requireSessionUser(req)
    if (!session.ok) return session.response

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    if (!adapter.findSystemConfigByUserId) {
      throw new Error(`${dbConfig.type} adapter does not implement findSystemConfigByUserId`)
    }

    const config = await adapter.findSystemConfigByUserId(dbConfig, session.userId)

    return NextResponse.json({ config: stripSecrets(config) })
  } catch (err) {
    console.error('get-db-config error:', err)
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 })
  }
}