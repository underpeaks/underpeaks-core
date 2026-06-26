// app/api/forgot-password/route.ts

/**
 * POST /api/forgot-password
 *
 * Initiates the password reset flow for a user who has forgotten their password.
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
 * Request body: { email: string }
 *
 * Responses:
 *   200 { success: true }                 — Reset handled successfully
 *   200 { success: true, notice: string } — Token created but SMTP disabled
 *   400 { error: string }                 — Missing email
 *   404 { error: string }                 — No account found for email
 *   500 { error: string }                 — Unexpected server error
 */

import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter '
import { NextRequest, NextResponse } from 'next/server'
import nodemailer                    from 'nodemailer'

// ---------------------------------------------------------------------------
// SMTP transporter factory
// ---------------------------------------------------------------------------

function buildTransporter() {
  return nodemailer.createTransport({
    host:   process.env.NEXT_PUBLIC_SMTP_HOST,
    port:   Number(process.env.NEXT_PUBLIC_SMTP_PORT),
    secure: process.env.NEXT_PUBLIC_SMTP_ENCRYPTION === 'SSL',
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USER,
      pass: process.env.NEXT_SMTP_PASSWORD?.replace(/\\#/g, '#'),
    },
  })
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Parse and validate request body ──────────────────────────────────

    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
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

      if (!result.success) {
        return NextResponse.json(
          { error: result.error ?? 'Failed to send reset email' },
          { status: 500 }
        )
      }

      console.log(`[forgot-password] ${dbType} reset email handled by adapter`)
      return NextResponse.json({ success: true })
    }

    // ── MongoDB / MySQL / PostgreSQL — manual token + optional SMTP ───────

    if (!adapter.findUserByEmail || !adapter.createPasswordResetToken) {
      throw new Error(
        'Adapter is missing required methods: findUserByEmail, createPasswordResetToken'
      )
    }

    const user = await adapter.findUserByEmail(dbConfig, email)
    if (!user) {
      return NextResponse.json(
        { error: 'No account found for this email address' },
        { status: 404 }
      )
    }

    const token     = await adapter.createPasswordResetToken(email)
    const resetLink = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password?token=${token}`

    // ── Send reset email via SMTP (if both flags are enabled) ─────────────

    const canSendEmail =
      process.env.NEXT_PUBLIC_SMTP_ENABLED   === 'true' &&
      process.env.NEXT_PUBLIC_SMTP_FORGOT_PW === 'true'

    if (!canSendEmail) {
      console.log('[forgot-password] SMTP disabled — reset email not sent')
      return NextResponse.json({
        success: true,
        notice:  'SMTP is disabled. No reset email was sent.',
      })
    }

    await buildTransporter().sendMail({
      from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
      to:      email,
      subject: 'Reset Your Password',
      html: `
        <p>Hello ${user.full_name || ''},</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
      `,
    })

    console.log('[forgot-password] Reset email sent via SMTP')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[forgot-password] Error:', err.message)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}