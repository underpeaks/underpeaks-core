// app/api/forgot-password/route.ts

/**
 * POST /api/forgot-password
 *
 * Initiates the password reset flow for a console user who has forgotten
 * their password.
 *
 * All DB types go through the same path — the adapter handles the difference:
 *   Firebase  → generatePasswordResetLink via Admin SDK (adapter.sendPasswordResetLink)
 *   Supabase  → Supabase Auth resetPasswordForEmail   (adapter.sendResetEmail)
 *   Mongo/MySQL/Postgres → token created + SMTP email sent
 *
 * SMTP feature flags (Mongo/MySQL/Postgres only):
 *   NEXT_PUBLIC_SMTP_ENABLED   — master switch for all SMTP sending
 *   NEXT_PUBLIC_SMTP_FORGOT_PW — specific flag for forgot-password emails
 *   Both must be 'true' for an email to be sent.
 *
 * Hardening (Oct 2026):
 *  - email must be a plain string (an object such as {"$ne": null} used to
 *    reach the database query on MongoDB).
 *  - Rate limited per IP and per email.
 *  - The answer is the same whether or not the account exists, so the route
 *    cannot be used to find out which emails are registered.
 *  - Customer and anonymous accounts never get a console reset token.
 *  - The user's name is escaped in the email; no internal error messages
 *    are returned.
 *
 * Request body: { email: string }
 *
 * Responses:
 *   200 { success: true }                 — Handled (also when no account exists)
 *   200 { success: true, notice: string } — SMTP disabled, no email was sent
 *   400 { error: string }                 — Missing or invalid email
 *   429 { error: string }                 — Too many requests
 *   500 { error: string }                 — Unexpected server error
 */

import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'
import { clientIp, rateLimit }       from '@/app/lib/rateLimit'
import { NextRequest, NextResponse } from 'next/server'
import { buildTransporter }          from '@/app/lib/smtp'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Parse and validate request body ──────────────────────────────────

    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // A plain string only — never an object that could reach a database query.
    const email = typeof body?.email === 'string' ? body.email.trim() : ''

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }
    if (email.length > 254 || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required' },
        { status: 400 }
      )
    }

    // ── Rate limit ─────────────────────────────────────────────────────────
    // 5 requests per hour for one email from one IP, 30 per IP.

    const ip   = clientIp(req)
    const rlIp = rateLimit(`console-forgot-ip:${ip}`, 30, 60 * 60 * 1000)
    const rlEm = rateLimit(`console-forgot:${ip}:${email.toLowerCase()}`, 5, 60 * 60 * 1000)
    if (!rlIp.ok || !rlEm.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(rlIp.retryAfter, rlEm.retryAfter)) } }
      )
    }

    // ── Get the configured adapter ────────────────────────────────────────

    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config
    const dbType   = dbConfig.type

    // ── Firebase + Supabase — adapter handles everything ──────────────────

    if (dbType === 'firebase' || dbType === 'supabase') {
      /**
       * Firebase adapter exposes sendPasswordResetLink.
       * Supabase adapter exposes sendResetEmail.
       * Try both so neither adapter needs to be changed.
       */
      const resetMethod = adapter.sendPasswordResetLink ?? adapter.sendResetEmail

      if (!resetMethod) {
        throw new Error(
          `${dbType} adapter does not implement sendPasswordResetLink or sendResetEmail`
        )
      }

      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password`
      const result      = await resetMethod.call(adapter, dbConfig, email, redirectUrl)

      // The browser always gets the same answer; a failure is logged only, so
      // the route cannot be used to find out which emails are registered.
      if (!result.success) {
        console.error(`[forgot-password] ${dbType} reset failed:`, result.error)
      } else {
        console.log(`[forgot-password] ${dbType} reset email handled by adapter`)
      }
      return NextResponse.json({ success: true })
    }

    // ── MongoDB / MySQL / PostgreSQL — manual token + optional SMTP ───────

    if (!adapter.findUserByEmail || !adapter.createPasswordResetToken) {
      throw new Error(
        'Adapter is missing required methods: findUserByEmail, createPasswordResetToken'
      )
    }

    const canSendEmail =
      process.env.NEXT_PUBLIC_SMTP_ENABLED   === 'true' &&
      process.env.NEXT_PUBLIC_SMTP_FORGOT_PW === 'true'

    const user: any = await adapter.findUserByEmail(dbConfig, email)

    // Customer and anonymous accounts reset through the public API, never here.
    const eligible =
      user &&
      user.user_type !== 'customer' &&
      user.role !== 'customer' &&
      !user.is_anonymous

    if (eligible) {
      const token     = await adapter.createPasswordResetToken(email)
      const resetLink = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password?token=${encodeURIComponent(token)}`

      if (canSendEmail) {
        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Reset Your Password',
          html: `
            <p>Hello ${escapeHtml(user.full_name || '')},</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
          `,
        })
        console.log('[forgot-password] Reset email sent via SMTP')
      }
    }

    if (!canSendEmail) {
      console.log('[forgot-password] SMTP disabled — reset email not sent')
      return NextResponse.json({
        success: true,
        notice:  'SMTP is disabled. No reset email was sent.',
      })
    }

    // Same answer whether or not the account exists.
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[forgot-password] Error:', err?.message)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}