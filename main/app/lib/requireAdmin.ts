// app/lib/requireAdmin.ts
//
// Signed-in AND admin. The caller comes from the Bearer token, never from a
// user_id in the request.

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { requireSessionUser }   from '@/app/lib/getSessionUser'

export type AdminResult =
  | { ok: true;  userId: string }
  | { ok: false; response: NextResponse }

export async function requireAdmin(req: NextRequest): Promise<AdminResult> {
  const session = await requireSessionUser(req)
  if (!session.ok) return { ok: false, response: session.response }

  const adapter = getConfiguredAdapter()
  const users   = (await adapter.readAll!(adapter.config, 'nxf_users')) as any[]
  const caller  = users.find((u) => u.user_id === session.userId)

  if (caller?.role !== 'admin') {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { ok: true, userId: session.userId }
}