// app/api/reset-password/route.ts

/**
 * POST /api/reset-password
 *
 * Resets a console user's password using a token issued by /api/forgot-password.
 *
 * Firebase and Supabase handle password reset entirely through their own
 * flows (the link in the email goes directly to their reset page).
 * This endpoint is only needed for MongoDB / MySQL / PostgreSQL where
 * tokens are managed manually.
 *
 * Hardening (Oct 2026):
 *  - token and password must be plain strings. A token sent as an object
 *    (for example {"$ne": null}) used to reach the Mongo query as an operator
 *    and match any user.
 *  - Rate limited: 10 attempts per hour per IP.
 *  - Customer and anonymous accounts are refused here; they reset through
 *    /api-public/v1/[project]/auth/reset-password.
 *  - Errors are generic; no internal messages leave the server.
 *
 * Request body: { token: string, password: string }
 *
 * Responses:
 *   200 { success: true }
 *   400 { error: string } — Missing fields or invalid/expired token.
 *   429 { error: string } — Too many attempts.
 *   500 { error: string } — Server error.
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { clientIp, rateLimit }  from '@/app/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'

const BAD_TOKEN = { error: 'Invalid or expired token' }

export async function POST(req: NextRequest) {
  try {
    // ── Validate body ───────────────────────────────────────────────────────

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Plain strings only — an object here would reach the database query.
    const token    = typeof body?.token === 'string' ? body.token.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }
    if (token.length > 256) {
      return NextResponse.json(BAD_TOKEN, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'Password is too long' }, { status: 400 })
    }

    // ── Rate limit ──────────────────────────────────────────────────────────
    // 10 attempts per hour per IP.

    const rl = rateLimit(`console-reset:${clientIp(req)}`, 10, 60 * 60 * 1000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    // ── Resolve adapter ─────────────────────────────────────────────────────

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    // Firebase and Supabase reset via their own SDK flows — not this endpoint
    if (dbType === 'firebase' || dbType === 'supabase') {
      return NextResponse.json(
        { error: `Password reset for ${dbType} is handled via the provider's own reset flow` },
        { status: 400 }
      )
    }

    // ── Capability check ────────────────────────────────────────────────────

    if (!adapter.findUserByToken || !adapter.updatePasswordByToken) {
      console.error(`[reset-password] ${dbType} adapter is missing token methods`)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // ── Validate token ──────────────────────────────────────────────────────

    const user: any = await adapter.findUserByToken(token)

    if (!user) {
      return NextResponse.json(BAD_TOKEN, { status: 400 })
    }

    // Customer and anonymous accounts use the public reset route.
    if (user.user_type === 'customer' || user.role === 'customer' || user.is_anonymous) {
      return NextResponse.json(BAD_TOKEN, { status: 400 })
    }

    // ── Update password ─────────────────────────────────────────────────────
    // The adapter hashes the plain password itself — never in the route.

    await adapter.updatePasswordByToken(token, password)

    console.log('[reset-password] Password reset completed successfully')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[reset-password] Error:', err?.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}