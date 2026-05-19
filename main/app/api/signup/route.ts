/**
 * POST /api/signup
 *
 * A Next.js Route Handler that registers a new user in whichever database
 * the project is configured to use, and optionally sends a verification email
 * via a custom SMTP server immediately after account creation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Database-agnostic design:
 * This handler reads NEXT_PUBLIC_DB_TYPE at runtime and branches into the
 * correct registration flow for that database. All five supported databases
 * are handled: Firebase, Supabase, MongoDB, MySQL, and PostgreSQL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Email verification strategy (per database):
 *
 * ┌──────────────┬───────────────────────────────────────────────────────────┐
 * │ DB type      │ Verification approach                                     │
 * ├──────────────┼───────────────────────────────────────────────────────────┤
 * │ firebase     │ If custom SMTP is enabled, the Firebase Admin SDK         │
 * │              │ generates a verification link and we send it ourselves.   │
 * │              │ Otherwise, the client-side Firebase SDK calls             │
 * │              │ sendEmailVerification() after sign-in.                    │
 * ├──────────────┼───────────────────────────────────────────────────────────┤
 * │ supabase     │ Supabase handles email verification natively. No SMTP     │
 * │              │ needed from our side.                                     │
 * ├──────────────┼───────────────────────────────────────────────────────────┤
 * │ mongodb      │ The adapter generates a one-time token. If custom SMTP    │
 * │ mysql        │ is enabled, we build a /verify-email URL with that token  │
 * │ postgres     │ and send it ourselves. Token expires in 24 hours.         │
 * └──────────────┴───────────────────────────────────────────────────────────┘
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SMTP feature flags (read once at module load — see top of file):
 * - NEXT_PUBLIC_SMTP_ENABLED       — master switch; must be 'true' to send any email
 * - NEXT_PUBLIC_SMTP_VERIFY_EMAIL  — enables sending verification emails on signup
 * - NEXT_PUBLIC_SMTP_FORGOT_PW     — enables sending password-reset emails (unused here)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   full_name: string   // The user's display name
 *   email:     string   // The user's email address (used as login identifier)
 *   password:  string   // The user's chosen password (hashed by the adapter)
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * { success: true, userId: string }   // Shape varies slightly by DB — see branches
 *
 * Failure (400 / 500):
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1. Parse and validate full_name, email, and password from the request body.
 * 2. Read NEXT_PUBLIC_DB_TYPE and branch into the correct registration flow.
 * 3. Check whether the email is already registered (where supported).
 * 4. Call the adapter's registration method to create the user record.
 * 5. If SMTP verification is enabled, send the verification email.
 * 6. Return a success response containing the new user's ID.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdapter }                 from '@/app/db-adapter'
import type { DBType, DBConfig }      from '@/app/db-adapter/types'
import crypto                         from 'crypto'
import nodemailer                     from 'nodemailer'
import admin                          from 'firebase-admin'

// ---------------------------------------------------------------------------
// Module-level SMTP feature flags
// ---------------------------------------------------------------------------

/**
 * These flags are read once when the module first loads (not on every request).
 * This is intentional — environment variables don't change at runtime, so
 * reading them once and storing the result is more efficient.
 *
 * smtpEnabled        — true if the SMTP server is configured and active.
 * verifyEmailEnabled — true if signup verification emails should be sent.
 * forgotPwEnabled    — true if password-reset emails should be sent (unused here,
 *                      but read so the module has the full picture).
 * canSendEmail       — convenience flag: true only when BOTH smtp and forgot-pw
 *                      are enabled. (Currently unused in this file but kept for
 *                      consistency with the broader email helper pattern.)
 */
const smtpEnabled        = (process.env.NEXT_PUBLIC_SMTP_ENABLED      ?? 'false') === 'true'
const verifyEmailEnabled = (process.env.NEXT_PUBLIC_SMTP_VERIFY_EMAIL  ?? 'false') === 'true'
const forgotPwEnabled    = (process.env.NEXT_PUBLIC_SMTP_FORGOT_PW     ?? 'false') === 'true'
const canSendEmail       = smtpEnabled && forgotPwEnabled

// ---------------------------------------------------------------------------
// SMTP transporter factory
// ---------------------------------------------------------------------------

/**
 * buildTransporter
 *
 * Creates and returns a Nodemailer SMTP transporter configured from
 * environment variables. Called immediately before sending an email so
 * that the configuration is always fresh (important if env vars are
 * injected at runtime in containerised environments).
 *
 * Environment variables used:
 * - NEXT_PUBLIC_SMTP_HOST        — SMTP server hostname
 * - NEXT_PUBLIC_SMTP_PORT        — SMTP port number
 * - NEXT_PUBLIC_SMTP_ENCRYPTION  — 'SSL' for port 465; anything else = STARTTLS
 * - NEXT_PUBLIC_SMTP_USER        — SMTP username / API key identifier
 * - NEXT_SMTP_PASSWORD           — SMTP password (supports escaped '#' chars via \#)
 *
 * Note: `secure: true` uses SSL from the first connection (port 465).
 * `secure: false` uses STARTTLS — an unencrypted connection that upgrades to
 * encrypted. Most modern SMTP providers use STARTTLS on port 587.
 */
function buildTransporter() {
  return nodemailer.createTransport({
    host:   process.env.NEXT_PUBLIC_SMTP_HOST,
    port:   Number(process.env.NEXT_PUBLIC_SMTP_PORT),
    secure: process.env.NEXT_PUBLIC_SMTP_ENCRYPTION === 'SSL',
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USER,
      // The password may contain '#' characters escaped as '\#' in the env file.
      // We strip the backslash so Nodemailer receives the real password.
      pass: process.env.NEXT_SMTP_PASSWORD?.replace(/\\#/g, '#'),
    },
  })
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  console.log('[Signup API] Request received')

  try {

    // -----------------------------------------------------------------------
    // 1. Parse and validate the request body
    // -----------------------------------------------------------------------

    /**
     * All three fields are required for every database type.
     * We reject immediately with a 400 if any are missing or falsy.
     * The password is hashed by the adapter — we never store it in plaintext.
     */
    const { full_name, email, password } = await req.json()
    if (!full_name || !email || !password)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 2. Read the database type
    // -----------------------------------------------------------------------

    /**
     * NEXT_PUBLIC_DB_TYPE determines which database and registration method
     * to use. Must be one of: 'firebase' | 'supabase' | 'mongodb' | 'mysql' | 'postgres'
     */
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    if (!dbType) throw new Error('NEXT_PUBLIC_DB_TYPE not set')

    let dbConfig: DBConfig

    // -----------------------------------------------------------------------
    // 3 – 6. Database-specific registration flows
    // -----------------------------------------------------------------------

    // ========================= FIREBASE =========================
    if (dbType === 'firebase') {
      /**
       * Build the Firebase DBConfig from the service account JSON stored in
       * the environment variable. The service account gives the Admin SDK the
       * credentials it needs to create users and generate verification links.
       *
       * We parse the JSON string into an object and immediately re-stringify it
       * for the dbConfig, because the adapter expects a JSON string in
       * `firebaseConfigJson`, not a plain object.
       */
      const serviceAccount = JSON.parse(process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT!)
      dbConfig = {
        type:               'firebase',
        firebaseConfigJson: JSON.stringify(serviceAccount),
        storageBucket:      'gs://' + serviceAccount.storageBucket,
      }

      const adapter = getAdapter(dbType, dbConfig)
      if (!adapter.registerUser)
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

      /**
       * Register the user in Firebase Authentication and create their profile
       * record in the nxf_users collection (handled by the adapter internally).
       */
      const result = await adapter.registerUser(dbConfig, { full_name, email, password })

      /**
       * Email verification for Firebase:
       *
       * Path A — Custom SMTP enabled:
       *   We use the Firebase Admin SDK to generate a verification link
       *   (generateEmailVerificationLink) and send it ourselves via SMTP.
       *   The link redirects to /signin after the user clicks it.
       *
       * Path B — Custom SMTP disabled:
       *   We do nothing here. The client-side Firebase SDK is expected to call
       *   sendEmailVerification() after the user signs in for the first time.
       *   This is Firebase's default behaviour and requires no server action.
       */
      if (smtpEnabled && verifyEmailEnabled) {
        const link = await admin.auth().generateEmailVerificationLink(email, {
          url: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/signin`,
        })
        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email:</p>
                    <a href="${link}">${link}</a>`,
        })
        console.log('[Signup API] Firebase verification email sent via custom SMTP')
      } else {
        console.log('[Signup API] Custom SMTP disabled — Firebase client SDK will handle verification')
      }

      return NextResponse.json({ success: true, userId: result.userId })
    }

    // ========================= SUPABASE =========================
    if (dbType === 'supabase') {
      /**
       * Supabase requires the project URL and service (anon) key.
       * We check for both before proceeding to give a clear error if either
       * is missing, rather than a cryptic adapter failure.
       */
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
      if (!supabaseUrl || !anonKey)
        throw new Error('Supabase env vars missing')

      dbConfig = { type: 'supabase', supabaseUrl, anonKey }

      const adapter = getAdapter(dbType, dbConfig)
      if (!adapter.registerSupabaseUser)
        throw new Error('registerSupabaseUser not implemented in this adapter')

      /**
       * Check for duplicate email before attempting registration.
       * Supabase would return its own error, but checking upfront lets us
       * return a consistent, user-friendly 400 message across all DB types.
       */
      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      const result = await adapter.registerSupabaseUser(dbConfig, { full_name, email, password })
      console.log('[Signup API] Supabase user created successfully')

      /**
       * Supabase handles email verification natively as part of its auth flow.
       * When the user signs up, Supabase automatically sends a confirmation email
       * using its own internal email provider. No SMTP action needed from us.
       */
      return NextResponse.json({ success: true, userId: result.id })
    }

    // ========================= MONGODB ==========================
    if (dbType === 'mongodb') {
      dbConfig = {
        type:             'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }

      const adapter = getAdapter(dbType, dbConfig)
      if (!adapter.registerMongoUser)
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

      // Prevent duplicate accounts by checking email uniqueness upfront
      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      /**
       * Register the user. We pass `email_verified: false` explicitly so the
       * adapter stores the correct initial state — the user must verify their
       * email before their account is considered fully active.
       *
       * The adapter generates and returns a one-time verification `token` that
       * we embed in the verification URL below.
       */
      const result = await adapter.registerMongoUser(dbConfig, {
        full_name,
        email,
        password,
        email_verified: false,
      })

      /**
       * Send the verification email if custom SMTP is enabled.
       * The token from the adapter is appended to the /verify-email URL.
       * When the user clicks the link, the verify-email page reads the token
       * and email from the query string and marks the account as verified.
       * Tokens expire after 24 hours (enforced by the adapter).
       */
      if (smtpEnabled && verifyEmailEnabled) {
        const verifyUrl =
          `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email` +
          `?token=${result.token}&email=${encodeURIComponent(email)}`
        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email (expires in 24h):</p>
                    <a href="${verifyUrl}">${verifyUrl}</a>`,
        })
        console.log('[Signup API] Verification email sent (MongoDB)')
      } else {
        console.log('[Signup API] Email verification disabled — skipping verification email')
      }

      return NextResponse.json({ success: true, user_id: result.user_id })
    }

    // ==================== MYSQL / POSTGRESQL ====================
    if (dbType === 'mysql' || dbType === 'postgres') {
      /**
       * MySQL and PostgreSQL share the same registration logic — the only
       * difference is which set of environment variables we read for the
       * connection config. We use a ternary to select the right set.
       *
       * Both databases use the same adapter.registerUser method and the same
       * SMTP verification email flow below.
       */
      dbConfig = dbType === 'mysql'
        ? {
            type:     'mysql',
            host:     process.env.NEXT_DB_MYSQL_HOST!,
            user:     process.env.NEXT_DB_MYSQL_USER!,
            password: process.env.NEXT_DB_MYSQL_PASSWORD!,
            database: process.env.NEXT_DB_MYSQL_DATABASE!,
            port:     process.env.NEXT_DB_MYSQL_PORT
              ? Number(process.env.NEXT_DB_MYSQL_PORT)
              : 3306,
          }
        : {
            type:     'postgres',
            host:     process.env.NEXT_DB_POSTGRES_HOST!,
            user:     process.env.NEXT_DB_POSTGRES_USER!,
            password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
            database: process.env.NEXT_DB_POSTGRES_DATABASE!,
            port:     process.env.NEXT_DB_POSTGRES_PORT
              ? Number(process.env.NEXT_DB_POSTGRES_PORT)
              : 5432,
          }

      const adapter = getAdapter(dbType, dbConfig)
      if (!adapter.registerUser)
        return NextResponse.json({ error: 'Adapter does not support signup' }, { status: 400 })

      // Prevent duplicate accounts by checking email uniqueness upfront
      const existingUser = await adapter.findUserByEmail!(dbConfig, email)
      if (existingUser)
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })

      /**
       * Generate a cryptographically secure verification token and a 24-hour
       * expiry timestamp before calling registerUser.
       *
       * Unlike MongoDB (where the adapter generates the token internally), for
       * MySQL and PostgreSQL we generate the token here and pass it in. This
       * lets us construct the verification URL before the DB call, and also
       * means we have the token available to embed in the email immediately
       * after the user record is created.
       *
       * crypto.randomBytes(32) produces 32 bytes of secure random data.
       * Converting to hex gives a 64-character string — long enough to be
       * computationally infeasible to guess.
       */
      const emailToken = crypto.randomBytes(32).toString('hex')
      const emailTTL   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const result = await adapter.registerUser(dbConfig, {
        full_name,
        email,
        password,
        token:     emailToken,
        token_ttl: emailTTL,
      })

      /**
       * Send the verification email if custom SMTP is enabled.
       * Same URL structure as the MongoDB flow above — the /verify-email page
       * reads the token and email query params to confirm the account.
       */
      if (smtpEnabled && verifyEmailEnabled) {
        const verifyUrl =
          `${process.env.NEXT_PUBLIC_APP_DOMAIN}/verify-email` +
          `?token=${emailToken}&email=${encodeURIComponent(email)}`
        await buildTransporter().sendMail({
          from:    process.env.NEXT_PUBLIC_SMTP_FROM || 'no-reply@example.com',
          to:      email,
          subject: 'Verify your email',
          html:    `<p>Hi ${full_name},</p>
                    <p>Click below to verify your email (expires in 24h):</p>
                    <a href="${verifyUrl}">${verifyUrl}</a>`,
        })
        console.log(`[Signup API] Verification email sent (${dbType})`)
      } else {
        console.log('[Signup API] Email verification disabled — skipping verification email')
      }

      return NextResponse.json({ success: true, ...result })
    }

    // If we reach this point, the DB type was set but not matched above
    throw new Error(`Unsupported DB type: ${dbType}`)

  } catch (err: any) {
    console.error('[Signup API] Unhandled error:', err)
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 })
  }
}