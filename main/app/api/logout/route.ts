// app/api/logout/route.ts

/**
 * POST /api/logout
 *
 * Next.js App Router API route that logs out the current user by invalidating
 * their session token in the database.
 *
 * Because NXT_Flutter supports multiple database backends, and because some
 * databases have built-in auth systems (Firebase, Supabase) while others use
 * a custom token table (MongoDB, MySQL, PostgreSQL), this route branches on
 * both the database type and the adapter's auth capabilities.
 *
 * Token resolution:
 * ─────────────────
 * The access token is read from the request body first. If it is not present
 * in the body, the route falls back to the Authorization header (Bearer token).
 * This dual-source approach supports both cookie-based and header-based
 * clients without requiring them to change their logout call.
 *
 * Logout flow by database type:
 * ──────────────────────────────
 * Firebase (built-in auth)
 *   Initialises the Firebase client SDK and calls signOut() to invalidate
 *   the Firebase session server-side.
 *
 * Supabase (built-in auth)
 *   Calls adapter.client.auth.signOut() to invalidate the Supabase session.
 *
 * MongoDB / MySQL / PostgreSQL (custom token flow)
 *   1. Looks up the stored token record by the raw access token string.
 *   2. If not found, returns 404.
 *   3. Marks the token as revoked (revoked: true) via adapter.extendToken().
 *      The token remains in the database but will be rejected on all future
 *      requests because the session middleware checks the revoked flag.
 *
 * Connection testing (MySQL / PostgreSQL):
 * ─────────────────────────────────────────
 * For MySQL and PostgreSQL, a direct connection test is performed before
 * the adapter is used. This provides a faster, clearer error message if the
 * database is unreachable rather than a cryptic adapter-level failure later.
 *
 * Request body (JSON):
 * ────────────────────
 *   token        {string} — The access token to invalidate. Can also be
 *                           supplied via the Authorization: Bearer header.
 *                           Required (one source must provide it).
 *   refreshToken {string} — The refresh token. Accepted but not currently
 *                           used in the logout flow (reserved for future use).
 *
 * Responses:
 * ──────────
 *   200 { success: true,  message }       — Logged out successfully.
 *   401 { success: false, error }         — No token provided.
 *   404 { success: false, error }         — Token not found in the database
 *                                           (custom token flow only).
 *   500 { success: false, error }         — Unexpected server error.
 */

import { NextRequest, NextResponse }  from 'next/server'
import { getTranslations }            from 'next-intl/server'
import { getAdapter }                 from '@/app/db-adapter'
import type { DBType, DBConfig }      from '@/app/db-adapter/types'
import mysql                          from 'mysql2/promise'
import { Client as PgClient }         from 'pg'
import {
  parseFirebaseServiceAccount,
  parseFirebaseWebConfig,
}                                     from '@/app/lib/firebaseConfig'

/**
 * POST
 *
 * Handles POST requests to /api/logout.
 * Resolves the correct DB adapter and invalidates the user's session token.
 *
 * @param req — The incoming Next.js API request containing the JSON body.
 * @returns A NextResponse JSON object indicating success or failure.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  /**
   * t — Server-side translation function scoped to the 'logoutRoute'
   * namespace. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
  //const t = await getTranslations('logoutRoute')

  try {
    // -----------------------------------------------------------------------
    // Parse request body
    // -----------------------------------------------------------------------

    /**
     * Attempt to parse the JSON body. If the body is missing or malformed,
     * the .catch(() => ({})) ensures we get an empty object rather than an
     * unhandled rejection — token resolution continues via the header fallback.
     */
    const body = await req.json().catch(() => ({}))
    let { token, refreshToken } = body

    // -----------------------------------------------------------------------
    // Token resolution — body first, then Authorization header
    // -----------------------------------------------------------------------

    /**
     * If the token was not in the body, attempt to read it from the
     * Authorization header. This supports clients that send the token as a
     * Bearer header rather than in the request body.
     */
    if (!token) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.replace('Bearer ', '')
      }
    }

    /**
     * If neither source provided a token, we cannot identify which session to
     * invalidate. Return 401 so the client knows authentication is required.
     */
    if (!token) {
      return NextResponse.json(
        { success: false, error: ('errors.tokenRequired') },
        { status: 401 },
      )
    }

    // -----------------------------------------------------------------------
    // Resolve database type
    // -----------------------------------------------------------------------

    /**
     * The database type is read from an environment variable rather than the
     * request body so the client cannot influence which adapter is resolved.
     */
    const dbType = process.env.NEXT_DB_TYPE as DBType
    if (!dbType) throw new Error(('errors.dbTypeNotSet'))

    let dbConfig: DBConfig

    // -----------------------------------------------------------------------
    // Build DB config from environment variables
    // -----------------------------------------------------------------------

    // ── Firebase ──────────────────────────────────────────────────────────

    /**
     * Firebase requires the service account JSON for Admin SDK access and
     * the web config for storageBucket. Both are parsed from env vars using
     * helpers that handle escaped and raw JSON formats.
     */
    if (dbType === 'firebase') {
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

      if (!serviceAccount) throw new Error(('errors.firebaseServiceAccountMissing'))

      const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
      const parsedConfig  = parseFirebaseWebConfig(configAccount)

      dbConfig = {
        type:               'firebase',
        firebaseConfigJson: JSON.stringify(parsedAccount),
        storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,
      }

    // ── Supabase ──────────────────────────────────────────────────────────

    /**
     * Supabase uses its URL and anonymous key for client initialisation.
     * The adapter's built-in auth flow handles session invalidation.
     */
    } else if (dbType === 'supabase') {
      dbConfig = {
        type:        'supabase',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }

    // ── MongoDB ───────────────────────────────────────────────────────────

    /**
     * MongoDB uses a connection string. The custom token flow will look up
     * and revoke the token in the tokens collection.
     */
    } else if (dbType === 'mongodb') {
      dbConfig = {
        type:             'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }

    // ── MySQL ─────────────────────────────────────────────────────────────

    /**
     * MySQL requires individual connection fields. A direct connection test
     * is performed first to surface DB connectivity issues with a clear error
     * rather than a confusing adapter-level failure.
     */
    } else if (dbType === 'mysql') {
      const host     = process.env.NEXT_DB_MYSQL_HOST
      const port     = process.env.NEXT_DB_MYSQL_PORT
        ? Number(process.env.NEXT_DB_MYSQL_PORT)
        : 3306
      const database = process.env.NEXT_DB_MYSQL_DATABASE
      const user     = process.env.NEXT_DB_MYSQL_USER
      const password = process.env.NEXT_DB_MYSQL_PASSWORD

      if (!host || !database || !user || !password) {
        throw new Error(('errors.mysqlEnvMissing'))
      }

      dbConfig = { type: 'mysql', host, port, database, user, password }

      /**
       * Test the MySQL connection before proceeding. createConnection() and
       * conn.end() open and immediately close a connection to verify the
       * credentials and network path are correct.
       */
      const conn = await mysql.createConnection({ host, port, user, password, database })
      await conn.end()

    // ── PostgreSQL ────────────────────────────────────────────────────────

    /**
     * PostgreSQL follows the same pattern as MySQL — individual fields plus
     * an upfront connection test for fast, clear error reporting.
     */
    } else if (dbType === 'postgres') {
      const host     = process.env.NEXT_DB_POSTGRES_HOST
      const port     = process.env.NEXT_DB_POSTGRES_PORT
        ? Number(process.env.NEXT_DB_POSTGRES_PORT)
        : 5432
      const database = process.env.NEXT_DB_POSTGRES_DATABASE
      const user     = process.env.NEXT_DB_POSTGRES_USER
      const password = process.env.NEXT_DB_POSTGRES_PASSWORD

      if (!host || !database || !user || !password) {
        throw new Error(('errors.postgresEnvMissing'))
      }

      dbConfig = { type: 'postgres', host, port, database, user, password }

      /**
       * Test the PostgreSQL connection. client.connect() opens the connection;
       * client.end() closes it cleanly. Any error here throws and is caught
       * by the outer catch block.
       */
      const client = new PgClient({ host, port, database, user, password })
      await client.connect()
      await client.end()

    } else {
      /**
       * Any DB type that reaches here is not yet supported by this route.
       */
      throw new Error('errors.unsupportedDbType', )
    }

    // -----------------------------------------------------------------------
    // Resolve the database adapter
    // -----------------------------------------------------------------------

    /**
     * getAdapter() returns the correct DBAdapter implementation initialised
     * with the dbConfig built above.
     */
    const adapter = getAdapter(dbType, dbConfig)

    // -----------------------------------------------------------------------
    // Logout — built-in auth vs custom token flow
    // -----------------------------------------------------------------------

    if (adapter.supportsBuiltInAuth) {

      // ── Built-in auth (Firebase / Supabase) ─────────────────────────────

      /**
       * Adapters that support built-in auth have their own session management.
       * We call the provider's SDK directly to invalidate the session.
       */

      if (dbType === 'firebase') {
        /**
         * Firebase: dynamically import the client SDK (avoids including it in
         * the server bundle when Firebase is not the active DB type), initialise
         * the app if it has not been already, and call signOut().
         */
        const { getApps, initializeApp } = await import('firebase/app')
        const { getAuth, signOut }        = await import('firebase/auth')
        const firebaseConfig = parseFirebaseWebConfig(
          process.env.NEXT_PUBLIC_FIREBASE_CONFIG!,
        )
        const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
        const auth = getAuth(app)
        await signOut(auth)

      } else if (dbType === 'supabase') {
        /**
         * Supabase: the adapter exposes a pre-initialised Supabase client.
         * Calling auth.signOut() invalidates the session on the Supabase side.
         */
        await adapter.client.auth.signOut()
      }

    } else {

      // ── Custom token flow (MongoDB / MySQL / PostgreSQL) ──────────────────

      /**
       * For self-hosted databases, sessions are stored as token records in the
       * database. Logout is performed by:
       *   1. Looking up the token record by the raw access token string.
       *   2. Marking it as revoked so the session middleware rejects it on
       *      all future requests.
       *
       * The token is not deleted — keeping it (but revoked) preserves an audit
       * trail and prevents token reuse attacks where a deleted token could
       * theoretically be re-created.
       */
      const storedToken = await adapter.findTokenByAccessToken?.(token)

      if (!storedToken) {
        return NextResponse.json(
          { success: false, error: ('errors.tokenNotFound') },
          { status: 404 },
        )
      }

      /**
       * Mark the token as revoked by updating the revoked flag and timestamp.
       * extendToken() is a generic "patch this token record" method on the
       * adapter — passing { revoked: true } is what signals logout.
       */
      await adapter.extendToken?.(storedToken.token_id, {
        revoked:    true,
        updated_at: new Date().toISOString(),
      })
    }

    // -----------------------------------------------------------------------
    // Success
    // -----------------------------------------------------------------------

    return NextResponse.json({
      success: true,
      message: ('success.loggedOut'),
    })

  } catch (err: any) {
    /**
     * Catch-all for unexpected errors — DB connection failures, missing env
     * vars, adapter method errors, or Firebase/Supabase SDK failures.
     * The raw error message is returned to give the client actionable context.
     */
    console.error(('logs.logoutError'), err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    )
  }
}