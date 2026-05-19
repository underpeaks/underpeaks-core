/**
 * POST /api/signin
 *
 * A Next.js Route Handler that authenticates a user against whichever database
 * the project is configured to use, and returns a session token pair on success.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Database-agnostic design:
 * This handler reads NEXT_PUBLIC_DB_TYPE at runtime and branches into the
 * correct authentication flow for that database. All five supported databases
 * are handled: Firebase, Supabase, MongoDB, MySQL, and PostgreSQL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   email:    string   // Required for Supabase / MongoDB / MySQL / Postgres
 *   password: string   // Required for Supabase / MongoDB / MySQL / Postgres
 *   idToken:  string   // Required for Firebase (Firebase ID token from client SDK)
 * }
 *
 * For Firebase, the ID token may also be supplied via the
 * "Authorization: Bearer <token>" header instead of the body.
 *
 * At least one of `email` or `idToken` must be present; otherwise the request
 * is rejected with a 400 Bad Request.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * {
 *   success:      true,
 *   user:         object,         // User profile from the database
 *   accessToken:  string,         // Session access token
 *   refreshToken: string,         // Session refresh token
 *   projectId:    string | null,  // The user's associated project ID (if any)
 * }
 *
 * Failure (400 / 401 / 500):
 * { success: false, error: "<reason string>" }
 *   — or —
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1.  Parse the request body and extract email, password, and/or idToken.
 * 2.  Validate that at least one of email or idToken is present.
 * 3.  Read NEXT_PUBLIC_DB_TYPE and build the matching DBConfig object.
 * 4.  Instantiate the database adapter via getAdapter().
 * 5.  Run the database-specific login flow (see per-branch comments below).
 * 6.  If login fails, return 401 with the error reason.
 * 7.  Return the user object, access token, and refresh token on success.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Helper function:
 * sendVerificationEmail — sends a verification link via SMTP using Nodemailer.
 * Defined at the bottom of this file. Currently called only from the Firebase
 * branch when a user's email is not yet verified (see email verification check).
 */

// app/api/signin/route.ts

import { NextRequest, NextResponse }  from 'next/server'
import { getAdapter }                 from '@/app/db-adapter'
import type { DBType, DBConfig }      from '@/app/db-adapter/types'
import crypto                         from 'crypto'
import nodemailer                     from 'nodemailer'
import {
  cleanEnvString,
  parseFirebaseServiceAccount,
  parseFirebaseWebConfig,
}                                     from '@/app/lib/firebaseConfig'

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  console.log('[Signin API] Request received')

  try {

    // -----------------------------------------------------------------------
    // 1. Parse the request body
    // -----------------------------------------------------------------------

    /**
     * We expect a JSON body containing at least one of:
     * - email + password  (used by Supabase, MongoDB, MySQL, PostgreSQL)
     * - idToken           (used by Firebase — the ID token from the client SDK)
     *
     * We use `.catch(() => ({}))` defensively in other routes, but here the
     * caller is expected to always send a JSON body, so we let it throw naturally
     * and rely on the outer try/catch to return a 500 if parsing fails.
     */
    const body = await req.json()
    const { email, password, idToken } = body

    console.log('[Signin API] Payload received:', {
      email,
      password: password ? '[REDACTED]' : null,
      idToken:  idToken  ? '[REDACTED]' : null,
    })

    // -----------------------------------------------------------------------
    // 2. Validate that at least one credential is present
    // -----------------------------------------------------------------------

    /**
     * Firebase users send an idToken; all other databases use email + password.
     * If neither is present, the request is malformed — return 400.
     */
    if (!email && !idToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // 3. Determine the database type and build the DBConfig object
    // -----------------------------------------------------------------------

    /**
     * NEXT_PUBLIC_DB_TYPE tells the handler which database driver and auth
     * strategy to use. It must be set in the environment before the app starts.
     * Valid values: 'firebase' | 'supabase' | 'mongodb' | 'mysql' | 'postgres'
     */
   const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
if (!dbType) throw new Error('NEXT_DB_TYPE not set')

let dbConfig: DBConfig = { type: dbType }

    // ========================= FIREBASE =========================
    if (dbType === 'firebase') {
      /**
       * Firebase requires two separate environment variables:
       *
       * NEXT_DB_FIREBASE_SERVICE_ACCOUNT — the Firebase Admin SDK service account
       * JSON. Used server-side to verify ID tokens and access Firestore securely.
       * `cleanEnvString` strips any shell escaping or extra whitespace that can
       * sneak in when the JSON is stored as an environment variable.
       *
       * NEXT_PUBLIC_FIREBASE_CONFIG — the public Firebase web SDK config object.
       * We only need it here to extract the `storageBucket` value, which is
       * required when initialising the Admin SDK's storage client.
       */
      const saRaw = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      if (!saRaw) throw new Error('Missing Firebase service account')
      const serviceAccount = cleanEnvString(saRaw)

      const webRaw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      if (!webRaw) throw new Error('Missing Firebase web config')
      const webConfig = parseFirebaseWebConfig(webRaw)

      const bucket =  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,

      dbConfig = {
        type:               'firebase',
        firebaseConfigJson: JSON.stringify(serviceAccount),
        storageBucket:      `gs://${bucket}`,
      }
      console.log('[Signin API] Firebase config prepared')
    }

    // ========================= SUPABASE =========================
    else if (dbType === 'supabase') {
      /**
       * Supabase needs the project URL and the service (anon) key.
       * Both are public-facing values safe to use server-side.
       */
      const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
      if (!url || !anonKey) throw new Error('Supabase env vars missing')

      dbConfig = {
        type: 'supabase',
        supabaseUrl: url,
        anonKey,
      }
    }

    // ========================= MONGODB ==========================
    else if (dbType === 'mongodb') {
      /**
       * MongoDB only needs a connection string and the target database name.
       * Authentication is handled by the adapter's loginWithMongo method.
       */
      dbConfig = {
        type:             'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    }

    // ========================== MYSQL ===========================
    else if (dbType === 'mysql') {
      /**
       * MySQL needs individual connection parameters. Port defaults to 3306
       * if NEXT_DB_MYSQL_PORT is not set in the environment.
       */
      dbConfig = {
        type:     'mysql',
        host:     process.env.NEXT_DB_MYSQL_HOST!,
        user:     process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
        port:     process.env.NEXT_DB_MYSQL_PORT
          ? Number(process.env.NEXT_DB_MYSQL_PORT)
          : 3306,
      }
    }

    // ======================== POSTGRESQL ========================
    else if (dbType === 'postgres') {
      /**
       * PostgreSQL mirrors the MySQL config shape. Port defaults to 5432
       * if NEXT_DB_POSTGRES_PORT is not set in the environment.
       */
      dbConfig = {
        type:     'postgres',
        host:     process.env.NEXT_DB_POSTGRES_HOST!,
        user:     process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DATABASE!,
        port:     process.env.NEXT_DB_POSTGRES_PORT
          ? Number(process.env.NEXT_DB_POSTGRES_PORT)
          : 5432,
      }
    }

    else {
      throw new Error(`Unsupported DB type: ${dbType}`)
    }

    // -----------------------------------------------------------------------
    // 4. Instantiate the database adapter
    // -----------------------------------------------------------------------

    /**
     * getAdapter() returns a database-specific adapter that exposes a consistent
     * interface (loginWithMongo, loginWithMySQL, validateBuiltInSession, etc.)
     * regardless of which database is being used underneath.
     */
    const adapter = getAdapter(dbType, dbConfig)
    if (!adapter) throw new Error('Adapter not found')

    console.log('[Signin API] Adapter ready, attempting login...')

    let loginResult: any
    let user: any

    // -----------------------------------------------------------------------
    // 5. Run the database-specific login flow
    // -----------------------------------------------------------------------

    // ========================= FIREBASE =========================
    if (dbType === 'firebase') {
      /**
       * Firebase authentication works differently from the other databases.
       * The client-side Firebase SDK handles the actual credential check
       * (email/password, Google sign-in, etc.) and gives the client an ID token.
       * The server's job is to VERIFY that ID token, not to check credentials.
       *
       * The ID token may arrive via:
       * 1. The "Authorization: Bearer <token>" header (preferred)
       * 2. The `idToken` field in the JSON body (fallback)
       *
       * We check the header first, then fall back to the body.
       */
      const idTokenFromHeader =
        req.headers.get('authorization')?.replace('Bearer ', '') || idToken

      if (!idTokenFromHeader) {
        return NextResponse.json(
          { success: false, error: 'No ID token provided' },
          { status: 401 }
        )
      }

      /**
       * Verify the ID token using the Firebase Admin SDK via the adapter.
       * If the token is invalid, tampered with, or expired, this throws and we
       * return 401. We never log the raw token — only the error if it fails.
       */
      let decodedToken: any
      try {
        decodedToken = await adapter!.validateBuiltInSession!(
          dbConfig,
          idTokenFromHeader
        )
      } catch (err) {
        console.error('[Signin API] Invalid Firebase ID token:', err)
        return NextResponse.json(
          { success: false, error: 'Invalid Firebase ID token' },
          { status: 401 }
        )
      }

      /**
       * The decoded token contains the Firebase UID. We use it to fetch the
       * full user profile from our custom nxf_users table (where we store
       * additional fields like full_name, role, status, avatar_url, etc.).
       */
      const uid        = decodedToken.uid
      const userResult = await adapter.getUserById!(uid)

      if (userResult.error || !userResult.user) {
        return NextResponse.json(
          { success: false, error: userResult.error || 'User not found' },
          { status: 401 }
        )
      }

      user = userResult.user

      loginResult = {
        success:      true,
        user,
        accessToken:  idTokenFromHeader,
        refreshToken: null,
      }

      /**
       * Email verification check.
       * If the user's email has not been verified yet, we block the login and
       * return a specific flag (`emailVerifiedRequired: true`) so the client
       * can show the appropriate "please verify your email" message.
       *
       * Note: `sendVerificationEmail` is defined at the bottom of this file and
       * can be called here if you want to automatically re-send the verification
       * link on each blocked login attempt.
       */
      if (!user?.email_verified) {
        return NextResponse.json({
          success: false,
          error:   'Please verify your email',
          user:    { ...user, emailVerifiedRequired: true },
        })
      }
    }

    // ========================= SUPABASE =========================
    else if (dbType === 'supabase') {
      /**
       * Supabase has a built-in auth system. We create a Supabase client and
       * call signInWithPassword directly. On success, Supabase returns a session
       * object containing both the access token and the refresh token.
       */
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(dbConfig.supabaseUrl!, dbConfig.anonKey!)

      const { data, error } = await supabase.auth.signInWithPassword({
        email:    email!,
        password: password!,
      })

      if (error || !data.session) {
        return NextResponse.json(
          { success: false, error: error?.message },
          { status: 401 }
        )
      }

      loginResult = {
        success:      true,
        user:         data.user,
        accessToken:  data.session.access_token,
        refreshToken: data.session.refresh_token,
      }
      user = data.user
    }

    // ========================= MONGODB ==========================
    else if (dbType === 'mongodb') {
      /**
       * For MongoDB (and MySQL/PostgreSQL below), authentication is handled
       * entirely by the adapter's custom login method. These methods look up
       * the user by email, verify the hashed password, and return a token pair.
       */
      loginResult = await adapter.loginWithMongo!(dbConfig, email!, password!)
      user        = loginResult.user
    }

    // ========================== MYSQL ===========================
    else if (dbType === 'mysql') {
      loginResult = await adapter.loginWithMySQL!(dbConfig, email!, password!)
      user        = loginResult.user
    }

    // ======================== POSTGRESQL ========================
    else if (dbType === 'postgres') {
      loginResult = await adapter.loginWithPostgres!(dbConfig, email!, password!)
      user        = loginResult.user
    }

    // -----------------------------------------------------------------------
    // 6. Reject failed logins
    // -----------------------------------------------------------------------

    /**
     * If any of the login flows above set `loginResult.success` to false,
     * we return 401 with whatever error message the adapter or auth system
     * provided, or a generic fallback if none was given.
     */
    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, error: loginResult.error || 'Signin failed' },
        { status: 401 }
      )
    }

    // -----------------------------------------------------------------------
    // 7. Return the session on success
    // -----------------------------------------------------------------------

    /**
     * Some adapters (e.g. Supabase, Firebase) return real cryptographic tokens.
     * Others (e.g. custom MongoDB/MySQL/Postgres flows) may return null for
     * one or both tokens if their implementation doesn't generate them yet.
     *
     * In those cases we fall back to a random UUID, which acts as an opaque
     * session identifier. This is a reasonable default for development but
     * should be replaced with a proper signed token strategy in production.
     */
    const accessToken  = loginResult.accessToken  ?? crypto.randomUUID()
    const refreshToken = loginResult.refreshToken ?? crypto.randomUUID()

    console.log('[Signin API] Login successful')

    return NextResponse.json({
      success: true,
      user,
      accessToken,
      refreshToken,
      projectId: loginResult.projectId,
    })

  } catch (err: any) {
    console.error('[Signin API] Unhandled error:', err)
    return NextResponse.json(
      { error: err.message || 'Signin failed' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Email Helper
// ---------------------------------------------------------------------------

/**
 * sendVerificationEmail
 *
 * Sends a one-time email verification link to a newly registered (or
 * unverified) user using Nodemailer and the project's configured SMTP server.
 *
 * When to call this:
 * Call this function after creating a new user account, or when a login
 * attempt is blocked because the user's email is not yet verified, to
 * automatically re-send the verification link.
 *
 * How it works:
 * 1. Creates a Nodemailer SMTP transporter using the NEXT_SMTP_* env variables.
 * 2. Builds a verification URL containing the one-time token and the user's
 *    email address as query parameters.
 * 3. Sends an HTML email with a clickable link to that URL.
 *
 * The receiving endpoint (e.g. /api/verify-email) is responsible for reading
 * the token and email from the query string and marking the user as verified.
 *
 * Environment variables required:
 * - NEXT_SMTP_HOST     — SMTP server hostname (e.g. "smtp.sendgrid.net")
 * - NEXT_SMTP_PORT     — SMTP port (e.g. 587 for TLS, 465 for SSL)
 * - NEXT_SMTP_SECURE   — "true" for SSL, "false" for TLS/STARTTLS
 * - NEXT_SMTP_USER     — SMTP username / API key identifier
 * - NEXT_SMTP_PASS     — SMTP password or API key (supports escaped # chars)
 * - NEXT_SMTP_FROM     — The "from" address shown to the recipient
 * - NEXT_PUBLIC_APP_DOMAIN — Base URL of the app (e.g. "https://myapp.com")
 *
 * @param fullName - The user's display name, used to personalise the greeting.
 * @param email    - The recipient's email address.
 * @param token    - A unique one-time verification token tied to this user.
 */
async function sendVerificationEmail(
  fullName: string,
  email:    string,
  token:    string
) {
  try {
    /**
     * createTransport sets up the SMTP connection. `secure: true` means the
     * connection uses SSL from the start (port 465). `secure: false` uses
     * STARTTLS (port 587), which upgrades a plain connection to encrypted.
     *
     * Note: The SMTP password may contain literal '#' characters that were
     * escaped as '\#' in the environment file. We strip those backslashes here
     * so Nodemailer receives the real password.
     */
    const transporter = nodemailer.createTransport({
      host:   process.env.NEXT_SMTP_HOST,
      port:   Number(process.env.NEXT_SMTP_PORT),
      secure: process.env.NEXT_SMTP_SECURE === 'true',
      auth: {
        user: process.env.NEXT_SMTP_USER,
        pass: (process.env.NEXT_SMTP_PASS || '').replace(/\\#/g, '#'),
      },
    })

    /**
     * Build the verification URL. The token and email are appended as query
     * parameters so the verification endpoint can look up and confirm the user.
     * The email is URI-encoded to handle special characters like '+' and '@'.
     */
    const verifyUrl =
      `${process.env.NEXT_PUBLIC_APP_DOMAIN}` +
      `/verify-email?token=${token}&email=${encodeURIComponent(email)}`

    await transporter.sendMail({
      from:    process.env.NEXT_SMTP_FROM,
      to:      email,
      subject: 'Verify your email',
      html: `
        <p>Hi ${fullName},</p>
        <p>Click below to verify your email:</p>
        <a href="${verifyUrl}">${verifyUrl}</a>
      `,
    })
  } catch (err) {
    /**
     * We catch and log SMTP errors here rather than re-throwing them.
     * A failed verification email should not crash the parent request
     * (e.g. the signup flow). The user can request a resend separately.
     */
    console.error('[Signin API] SMTP error sending verification email:', err)
  }
}