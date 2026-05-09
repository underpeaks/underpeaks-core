import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter } from '@/app/lib/getStorageAdapter'

export async function POST(req: NextRequest) {
  try {
    const { full_name } = await req.json()

    if (!full_name?.trim())
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })

    // ── Resolve user from token ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null

    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // ── Update nxf_users ───────────────────────────────────────────────────
    await adapter.update!(adapter.config, 'nxf_users', uid, {
      full_name: full_name.trim(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[update-profile]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}