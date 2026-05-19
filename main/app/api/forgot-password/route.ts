// app/api/forgot-password/route.ts

/**
 * POST /api/forgot-password
 *
 * Next.js App Router API route that initiates the password reset flow for a
 * user who has forgotten their password.
 *
 * Because NXT_Flutter supports multiple database backends, the reset flow
 * differs by database type. This route handles all supported adapters in one
 * place, branching on the NEXT_PUBLIC_DB_TYPE environment variable.
 *
 * Flow by database type:
 * ───────────────────────
 * Firebase
 *   Password reset is handled entirely client-side via the Firebase SDK's
 *   sendPasswordResetEmail() function. This route should never be called for
 *   Firebase — if it is, a 400 is returned explaining this.
 *
 * Supabase
 *   Delegates to the Supabase adapter's sendResetEmail() method, which uses
 *   Supabase Auth's built-in password reset email functionality. No SMTP
 *   configuration is needed for Supabase.
 *
 * MongoDB / MySQL / PostgreSQL
 *   1. Resolves the correct adapter and DB config from environment variables.
 *   2. Looks up the user by email — returns 404 if not found.
 *   3. Creates a time-limited password reset token via the adapter.
 *   4. Builds a reset link pointing to /reset-password?token=<token>.
 *   5. If SMTP is enabled and the forgot-password feature flag is on:
 *      sends a branded HTML email containing the reset link.
 *   6. If SMTP is disabled: returns the notice message so an administrator
 *      can manually assist the user (or a developer can use the link directly
 *      in non-production environments).
 *
 * SMTP feature flags:
 * ────────────────────
 * Two environment variables gate email sending:
 *   NEXT_PUBLIC_SMTP_ENABLED   — master switch for all SMTP sending.
 *   NEXT_PUBLIC_SMTP_FORGOT_PW — specific flag for forgot-password emails.
 * Both must be 'true' for an email to be sent.
 *
 * Request body (JSON):
 * ────────────────────
 *   email {string} — The email address of the user requesting a password reset.
 *                    Required.
 *
 * Responses:
 * ──────────
 *   200 { success: true }                    — Reset email sent (or handled
 *                                              by Supabase Auth).
 *   200 { success: true, notice: string }    — Reset token created but SMTP
 *                                              is disabled; notice explains why
 *                                              no email was sent.
 *   400 { error: string }                    — Missing email, Firebase DB type,
 *                                              or unsupported operation.
 *   404 { error: string }                    — User not found for given email.
 *   500 { error: string }                    — Unexpected server error.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getAdapter }                from '@/app/db-adapter'
import nodemailer                    from 'nodemailer'
import { DBType }                    from '@/app/db-adapter/types'

// ---------------------------------------------------------------------------
// SMTP feature flags
// ---------------------------------------------------------------------------

/**
 * smtpEnabled
 * Master switch — true when NEXT_PUBLIC_SMTP_ENABLED is set to 'true'.
 * If false, no emails will be sent regardless of other settings.
 */
const smtpEnabled     = process.env.NEXT_PUBLIC_SMTP_ENABLED   === 'true'

/**
 * forgotPwEnabled
 * Feature-specific flag — true when NEXT_PUBLIC_SMTP_FORGOT_PW is 'true'.
 * Allows SMTP to be enabled globally while disabling forgot-password emails
 * specifically (e.g. when an admin wants to handle resets manually).
 */
const forgotPwEnabled = process.env.NEXT_PUBLIC_SMTP_FORGOT_PW === 'true'

/**
 * canSendEmail
 * Derived flag — true only when both smtpEnabled AND forgotPwEnabled are true.
 * Used as the single gate before attempting to send a reset email.
 */
const canSendEmail    = smtpEnabled && forgotPwEnabled

// ---------------------------------------------------------------------------
// SMTP transporter factory
// ---------------------------------------------------------------------------

/**
 * buildTransporter
 *
 * Creates and returns a Nodemailer SMTP transporter configured from
 * environment variables. Called only when canSendEmail is true.
 *
 * Why a factory function rather than a module-level singleton?
 * Environment variables are read at module load time in Next.js, but a factory
 * ensures the transporter is created fresh on each use so any runtime changes
 * to env vars (rare but possible in some hosting setups) are picked up.
 *
 * Note on NEXT_SMTP_PASSWORD:
 * The password may contain literal `\#` sequences (escaped hashes from some
 * .env parsers). These are replaced with plain `#` before being passed to
 * Nodemailer so the actual password is transmitted correctly.
 *
 * @returns A configured Nodemailer transporter instance ready to send mail.
 */
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

/**
 * POST
 *
 * Handles POST requests to /api/forgot-password.
 * See the file-level JSDoc above for the full flow description.
 *
 * @param req — The incoming Next.js API request containing the JSON body.
 * @returns A NextResponse JSON object describing the outcome.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  /**
   * t — Server-side translation function scoped to the 'forgotPasswordRoute'
   * namespace. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
  //const t = await getTranslations('forgotPasswordRoute')

  try {
    // -----------------------------------------------------------------------
    // Parse and validate request body
    // -----------------------------------------------------------------------

    const { email } = await req.json()

    /**
     * Email is the only required field. Without it we cannot look up the user
     * or address the reset email.
     */
    if (!email) {
      return NextResponse.json(
        { error: ('errors.emailRequired') },
        { status: 400 },
      )
    }

    // -----------------------------------------------------------------------
    // Resolve database type
    // -----------------------------------------------------------------------

    /**
     * The database type is read from an environment variable rather than the
     * request body because it is a server-side infrastructure concern — the
     * client should not be able to influence which database adapter is used.
     */
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    if (!dbType) throw new Error(('errors.dbTypeNotSet'))

    // -----------------------------------------------------------------------
    // Firebase — client-side only
    // -----------------------------------------------------------------------

    /**
     * Firebase password reset is handled entirely by the Firebase client SDK
     * (sendPasswordResetEmail). This server route should never be called for
     * Firebase projects. If it is, return a clear 400 so the caller knows
     * to use the client-side flow instead.
     */
    if (dbType === 'firebase') {
      return NextResponse.json(
        { error: ('errors.firebaseClientSide') },
        { status: 400 },
      )
    }

    // -----------------------------------------------------------------------
    // Supabase — delegate to adapter's built-in reset flow
    // -----------------------------------------------------------------------

    /**
     * Supabase Auth handles password reset emails natively. We initialise the
     * Supabase adapter and call its sendResetEmail() method, which internally
     * uses the Supabase Admin SDK to trigger the reset flow.
     *
     * The redirect URL tells Supabase where to send the user after they click
     * the link in the email — it must be an allowed redirect URL in the
     * Supabase Auth settings.
     */
    if (dbType === 'supabase') {
      const adapter = getAdapter(dbType, {
        type:        'supabase',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey:     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
      })

      if (!adapter.sendResetEmail)
        throw new Error(('errors.supabaseMissingMethod'))

      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password`
      await adapter.sendResetEmail(adapter.config, email, redirectUrl)

      console.log(('logs.supabaseResetSent'))
      return NextResponse.json({ success: true })
    }

    // -----------------------------------------------------------------------
    // MongoDB / MySQL / PostgreSQL — manual token + SMTP flow
    // -----------------------------------------------------------------------

    /**
     * For self-hosted databases, we manage the reset flow ourselves:
     *   1. Build the DB config from environment variables.
     *   2. Find the user, create a token, build a reset link.
     *   3. Send a reset email via SMTP (if enabled).
     */
    let dbConfig: any

    // MongoDB — connection string-based config
    if (dbType === 'mongodb') {
      dbConfig = {
        type:             'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    }

    // MySQL — individual host/port/user/password/database fields
    else if (dbType === 'mysql') {
      dbConfig = {
        type:     'mysql',
        host:     process.env.NEXT_DB_MYSQL_HOST!,
        port:     Number(process.env.NEXT_DB_MYSQL_PORT || 3306),
        user:     process.env.NEXT_DB_MYSQL_USER!,
        /**
         * MySQL passwords may contain double-quote characters that some .env
         * parsers introduce. Strip them before use.
         */
        password: process.env.NEXT_DB_MYSQL_PASSWORD?.replace(/["]/g, '')!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
      }
    }

    // PostgreSQL — individual host/port/user/password/database fields
    else if (dbType === 'postgres') {
      dbConfig = {
        type:     'postgres',
        host:     process.env.NEXT_DB_POSTGRES_HOST!,
        port:     Number(process.env.NEXT_DB_POSTGRES_PORT || 5432),
        user:     process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DATABASE!,
      }
    } else {
      // Any DB type that reaches here is not yet supported by this route
      throw new Error('errors.unsupportedDbType',  dbType )
    }

    /**
     * Resolve the adapter for the selected database type and verify it
     * implements the two methods this flow requires:
     *   - findUserByEmail        : look up the user record by email address.
     *   - createPasswordResetToken : generate and store a time-limited token.
     */
    const adapter = getAdapter(dbType, dbConfig)

    if (!adapter.findUserByEmail || !adapter.createPasswordResetToken)
      throw new Error('errors.adapterMissingMethods',   )

    // -----------------------------------------------------------------------
    // Look up the user
    // -----------------------------------------------------------------------

    /**
     * Return 404 if no account exists for this email. We intentionally do NOT
     * reveal whether the email is registered — however, a 404 here is an
     * acceptable trade-off for a clearer installer/admin UX. If your app
     * requires user enumeration protection, change this to always return 200.
     */
    const user = await adapter.findUserByEmail(adapter.config, email)
    if (!user) {
      return NextResponse.json(
        { error: ('errors.userNotFound') },
        { status: 404 },
      )
    }

    // -----------------------------------------------------------------------
    // Create the reset token and build the reset link
    // -----------------------------------------------------------------------

    /**
     * The adapter creates a cryptographically random token and stores it in
     * the database with an expiry timestamp. The token is then appended to
     * the reset URL so the /reset-password page can verify it.
     */
    const token     = await adapter.createPasswordResetToken(email)
    const resetLink = `${process.env.NEXT_PUBLIC_APP_DOMAIN}/reset-password?token=${token}`

    // -----------------------------------------------------------------------
    // Send the reset email (or return the notice if SMTP is disabled)
    // -----------------------------------------------------------------------

    if (canSendEmail) {
      /**
       * Build and send the HTML reset email via the configured SMTP transporter.
       * The email includes the user's name (if available) and a clickable link.
       */
     await buildTransporter().sendMail({
  from: process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
  to: email,
  subject: 'Reset Your Password',
  html: `
    <p>Hello ${user.full_name || ''},</p>
    <p>Click the link below to reset your password:</p>
    <p>
      <a href="${resetLink}">
        Reset Password
      </a>
    </p>
  `,
})
      console.log(('logs.resetEmailSent'))
    } else {
      /**
       * SMTP is disabled (either globally or for this feature specifically).
       * Return a notice so the caller knows why no email was sent. In a
       * non-production environment a developer can still use the reset link
       * by reading it from the database directly.
       */
      console.log(('logs.smtpDisabled'))
      return NextResponse.json({
        success: true,
        notice:  ('notices.smtpDisabled'),
      })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    /**
     * Catch-all for unexpected errors — DB connection failures, adapter
     * method errors, SMTP send failures, etc. The error message is returned
     * to the caller so the UI can display a meaningful failure reason.
     */
    console.error(('logs.forgotPasswordError'), err)
    return NextResponse.json(
      { error: err.message || ('errors.genericFailure') },
      { status: 500 },
    )
  }
}