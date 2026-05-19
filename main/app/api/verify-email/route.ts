/**
 * API Route: GET /api/auth/verify-email
 *
 * A server-side endpoint that verifies a user's email address using a token
 * and email address passed as URL query parameters.
 *
 * What this route does:
 * 1. Reads `token` and `email` from the URL query parameters.
 *    Example: /api/auth/verify-email?token=abc123&email=user@example.com
 * 2. Validates that both parameters are present.
 * 3. Determines the configured database type and builds the correct adapter
 *    config. Supports Firebase, Supabase, MongoDB, MySQL, and Postgres.
 * 4. If the resolved adapter has a native verifyEmail method, delegates to it
 *    directly — this is the preferred path.
 * 5. If no native method exists, falls back to a manual verification flow
 *    that differs per database type:
 *    - SQL (MySQL / Postgres): finds the user by token, checks expiry, then
 *      marks email_verified = true and clears the token fields.
 *    - Firebase: finds the user by email, then marks email_verified = true.
 * 6. If no supported path is found, returns a 400 error.
 *
 * Authentication: None — this endpoint is public by design. The token in
 *                 the URL acts as the one-time proof of ownership.
 * Method:         GET
 * Query params:   token (string, required), email (string, required)
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getAdapter }                from '@/app/db-adapter'
import type { DBType, DBConfig, DBAdapter } from '@/app/db-adapter/types'

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

/**
 * GET
 *
 * Verifies a user's email address via a one-time token.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @param req - The incoming Next.js server request. Must include `token`
 *              and `email` as URL query parameters.
 * @returns A NextResponse containing { success: true } on success,
 *          or { error: string } on failure.
 */
export async function GET(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'verifyEmail' namespace.
   * Because this is a server route we use getTranslations() (async) rather
   * than the client-side useTranslations() hook.
   */
  //const t = await getTranslations('verifyEmail')

  console.log(('logs.requestReceived'))

  try {
    // ── Read and validate query parameters ──────────────────────────────────

    /**
     * Extract the two required query parameters from the request URL.
     *
     * - token: A one-time verification token that was emailed to the user.
     *          Used to prove that the request comes from someone who has
     *          access to the email inbox.
     * - email: The email address being verified. Used to look up the user
     *          record in database types that do not support token lookup.
     */
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    /**
     * Both parameters are required. Without the token we cannot verify
     * ownership; without the email we cannot look up the user in some
     * adapter paths. Return 400 if either is missing.
     */
    if (!token || !email)
      return NextResponse.json(
        { error: ('errors.missingTokenOrEmail') },
        { status: 400 }
      )

    // ── Resolve database type ────────────────────────────────────────────────

    /**
     * Read the configured database type from the environment.
     * If it is not set, we cannot proceed — throw immediately.
     */
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE
    if (!dbType) throw new Error(('errors.dbTypeNotSet'))

    // ── Build database config ────────────────────────────────────────────────

    /**
     * Each supported database type requires a different config shape.
     * We build the correct one here based on dbType, reading credentials
     * from environment variables.
     *
     * The `!` non-null assertions on env vars are intentional — if a required
     * variable is missing, the adapter will throw a clear error when it tries
     * to use it, which is caught by the outer try/catch.
     */
    let dbConfig: DBConfig

    // ── Firebase ─────────────────────────────────────────────────────────────
    if (dbType === 'firebase') {
      /**
       * Parse the Firebase service account JSON from the environment.
       * This gives us the credentials needed for Firebase Admin SDK operations.
       */
      const serviceAccount = JSON.parse(
        process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT!
      )

      dbConfig = {
        type:               'firebase',
        firebaseConfigJson: JSON.stringify(serviceAccount),
        storageBucket:      'gs://' + serviceAccount.storageBucket,
      }
    }

    // ── Supabase ──────────────────────────────────────────────────────────────
    else if (dbType === 'supabase') {
      dbConfig = {
        type:        'supabase',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        anonKey:     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
      }
    }

    // ── MongoDB ───────────────────────────────────────────────────────────────
    else if (dbType === 'mongodb') {
      dbConfig = {
        type:             'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    }

    // ── MySQL ─────────────────────────────────────────────────────────────────
    else if (dbType === 'mysql') {
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

    // ── Postgres ──────────────────────────────────────────────────────────────
    else if (dbType === 'postgres') {
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

    // ── Unsupported ───────────────────────────────────────────────────────────
    else {
      /**
       * The configured DB type is not one we know how to handle.
       * Throw a clear error so the developer knows to add support for it
       * rather than getting a cryptic "dbConfig is undefined" crash later.
       */
      throw new Error(('errors.unsupportedDbType'))
    }

    // ── Resolve adapter ──────────────────────────────────────────────────────

    /**
     * Initialise the database adapter using the config we built above.
     * The adapter provides all the methods needed to interact with the
     * specific database backend.
     */
    const adapter = getAdapter(dbType, dbConfig) as DBAdapter

    // ── Path 1: Native adapter verifyEmail method ────────────────────────────

    /**
     * If the adapter implements a native verifyEmail method, use it.
     * This is the preferred path — it lets each adapter handle its own
     * verification logic internally, keeping this route clean.
     *
     * We pass the full dbConfig alongside the token and email so the adapter
     * has everything it needs to perform the verification.
     */
    if (adapter.verifyEmail) {
      await adapter.verifyEmail(dbConfig, { token, email })
      return NextResponse.json({ success: true })
    }

    // ── Path 2: SQL fallback (MySQL / Postgres) ───────────────────────────────

    /**
     * For SQL databases without a native verifyEmail, we perform the
     * verification manually in three steps:
     *
     * 1. Find the user record that matches the token.
     * 2. Check that the token has not expired (token_ttl is in the future).
     * 3. Mark the user's email as verified and clear the token fields.
     *
     * We first check that the required adapter methods exist — if they are
     * missing, the adapter is incomplete and we throw a clear error.
     */
    if (dbType === 'mysql' || dbType === 'postgres') {
      if (!adapter.findUserByToken || !adapter.updateUser)
        throw new Error(('errors.sqlAdapterMissingMethods'))

      /**
       * Look up the user record by the verification token.
       * If no user is found, the token is invalid (never existed or already used).
       */
      const user = await adapter.findUserByToken(token)

      if (!user)
        return NextResponse.json(
          { error: ('errors.invalidToken') },
          { status: 400 }
        )

      /**
       * Check token expiry. token_ttl is the "time to live" timestamp —
       * if the current time is past it, the token has expired and the
       * user must request a new verification email.
       */
      if (user.token_ttl && new Date(user.token_ttl) < new Date())
        return NextResponse.json(
          { error: ('errors.tokenExpired') },
          { status: 400 }
        )

      /**
       * Mark the email as verified and remove the token fields so this
       * token cannot be used again.
       */
      await adapter.updateUser(dbConfig, user.id, {
        email_verified: true,
        token:          null,
        token_ttl:      null,
      })

      return NextResponse.json({ success: true })
    }

    // ── Path 3: Firebase fallback ────────────────────────────────────────────

    /**
     * For Firebase without a native verifyEmail, we look the user up by
     * their email address and mark email_verified = true directly.
     *
     * Note: Firebase Authentication handles its own token-based email
     * verification natively — this fallback path is for cases where the
     * project uses Firebase Firestore as a database but manages its own
     * email verification flow outside of Firebase Auth.
     */
    if (dbType === 'firebase') {
      if (!adapter.updateUser || !adapter.findUserByEmail)
        throw new Error(('errors.firebaseAdapterMissingMethods'))

      /**
       * Find the user record in Firestore by their email address.
       * If not found, the email address in the verification link is wrong.
       */
      const user = await adapter.findUserByEmail(dbConfig, email)

      if (!user)
        return NextResponse.json(
          { error: ('errors.userNotFound') },
          { status: 400 }
        )

      /**
       * Mark the email as verified in the Firestore user record.
       */
      await adapter.updateUser(dbConfig, user.id, {
        email_verified: true,
      })

      return NextResponse.json({ success: true })
    }

    // ── Path 4: No supported verification path found ─────────────────────────

    /**
     * We reach here if the database type is technically supported (it passed
     * the config-building step above) but has no verification path implemented
     * — e.g. Supabase without a native verifyEmail method.
     *
     * Return 400 so the caller knows verification is not available rather than
     * giving a misleading success or a 500 internal error.
     */
    console.log(('logs.verificationNotSupported'))
    return NextResponse.json(
      { error: ('errors.verificationNotSupported') },
      { status: 400 }
    )

  } catch {
    /**
     * Catch-all for any unexpected errors (missing env vars, database down,
     * JSON parse failure on service account, adapter method crash, etc.).
     *
     * We return a generic 500 without echoing back the raw error object or
     * its message — leaking database credentials, service account details,
     * or internal stack traces is a security risk.
     */
    return NextResponse.json(
      { error: ('errors.verificationFailed') },
      { status: 500 }
    )
  }
}