// app/api/auth/reset-password/route.ts

/**
 * POST /api/auth/reset-password
 *
 * Resets a user's password using a token issued by /api/forgot-password.
 *
 * Firebase and Supabase handle password reset entirely through their own
 * flows (the link in the email goes directly to their reset page).
 * This endpoint is only needed for MongoDB / MySQL / PostgreSQL where
 * tokens are managed manually.
 *
 * Request body: { token: string, password: string }
 *
 * Responses:
 *   200 { success: true }
 *   400 { error: string } — Missing fields or invalid/expired token.
 *   500 { error: string } — Server error.
 */

import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // ── Validate body ───────────────────────────────────────────────────────

    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
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

    if (!adapter.findUserByToken || !adapter.updatePasswordByToken || !adapter.hashPassword) {
      throw new Error(`${dbType} adapter is missing required methods: findUserByToken, updatePasswordByToken, hashPassword`)
    }

    // ── Validate token ──────────────────────────────────────────────────────

    const user = await adapter.findUserByToken(token)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // ── Hash password via adapter — never in the route ──────────────────────

    const hashedPassword = await adapter.hashPassword(password)

    // ── Update password ─────────────────────────────────────────────────────

    await adapter.updatePasswordByToken(token, hashedPassword)

    console.log('[reset-password] Password reset completed successfully')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[reset-password] Error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}