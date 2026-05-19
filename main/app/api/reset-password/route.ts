/**
 * POST /api/auth/reset-password
 *
 * A Next.js API route that resets a user's password using a password-reset
 * token (typically sent to the user via email in a reset-password link).
 *
 * How the reset flow works:
 * 1. The user requests a password reset — a unique token is generated and
 *    emailed to them (handled by a separate endpoint).
 * 2. The user clicks the link in the email, which brings them to a reset
 *    password form in the UI containing the token in the URL.
 * 3. The UI submits the new password + token to THIS endpoint.
 * 4. This endpoint validates the token, hashes the new password, and
 *    updates the user's password in the database.
 *
 * Request:
 * - Method:  POST
 * - Headers: Content-Type: application/json
 * - Body:    { token: string, password: string }
 *
 * Response (success):
 * - 200 { success: true }
 *
 * Response (error):
 * - 400 { error: 'Token and password are required' } — Missing body fields.
 * - 400 { error: 'Invalid or expired token' }        — Token not found in DB.
 * - 500 { error: string }                            — Server/config error.
 *
 * Supported database types (set via NEXT_DB_TYPE env variable):
 * - supabase  — Uses NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - mongodb   — Uses NEXT_DB_MONGO_URI + NEXT_DB_MONGO_DB_NAME
 * - mysql     — Uses NEXT_DB_MYSQL_HOST/USER/PASSWORD/DATABASE/PORT
 * - postgres  — Uses NEXT_DB_POSTGRES_HOST/USER/PASSWORD/DB/PORT
 * - firebase  — Not handled here (throws — managed by a separate route)
 *
 * Security notes:
 * - The raw password is NEVER logged or stored — only the bcrypt hash is
 *   passed to the adapter and written to the database.
 * - The reset token is NEVER logged to prevent it from appearing in server
 *   logs where it could be read and misused.
 * - bcrypt is used with a salt round of 10, which is the industry standard
 *   for a strong balance between security and performance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdapter }                from '@/app/db-adapter'
import { DBType }                    from '@/app/db-adapter/types'
import bcrypt                        from 'bcrypt'

/**
 * POST handler
 *
 * Validates the reset token, hashes the new password, and updates
 * the user's password in the appropriate database via the adapter.
 *
 * @param req - The incoming Next.js server request object.
 * @returns    A NextResponse with { success: true } or an error object.
 */
export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Parse and validate the request body
    // -----------------------------------------------------------------------

    /**
     * Extract `token` and `password` from the JSON request body.
     * Both fields are required:
     * - `token`    — The password-reset token from the user's email link.
     * - `password` — The new plain-text password the user wants to set.
     *
     * SECURITY: Neither value is logged at any point in this handler.
     */
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Step 2: Read and validate the database type from environment
    // -----------------------------------------------------------------------

    /**
     * Read the database type from the NEXT_DB_TYPE environment variable.
     * This determines which database adapter to use for looking up the
     * token and updating the password.
     */
    const envDbType = process.env.NEXT_DB_TYPE
    if (!envDbType) throw new Error('NEXT_DB_TYPE not set')

    /**
     * Validate that the db type is one of the supported values.
     * If the environment variable contains an unsupported value, we throw
     * immediately with a descriptive error rather than failing silently later.
     *
     * The immediately-invoked function in the else branch is a concise way
     * to throw inside a ternary expression — it reads: "if none of the above
     * match, throw with a descriptive message".
     */
    const dbType: DBType =
      envDbType === 'firebase'  ||
      envDbType === 'supabase'  ||
      envDbType === 'mongodb'   ||
      envDbType === 'mysql'     ||
      envDbType === 'postgres'
        ? envDbType
        : (() => { throw new Error(`Unsupported NEXT_DB_TYPE: ${envDbType}`) })()

    console.log(`[reset-password] Processing password reset for db type: ${dbType}`)

    // -----------------------------------------------------------------------
    // Step 3: Build the database config from environment variables
    // -----------------------------------------------------------------------

    /**
     * `dbConfig` holds the connection configuration for the selected adapter.
     * Each database type reads from its own set of environment variables.
     * The config object shape matches what `getAdapter()` expects for each type.
     *
     * SECURITY: Database credentials (passwords, connection strings) from
     * env vars are passed directly to the adapter and are NEVER logged.
     */
    let dbConfig: any

    // Firebase is handled by a separate dedicated route — not supported here
    if (dbType === 'firebase') {
      throw new Error('Firebase handled separately')
    }

    // Supabase — requires project URL and anon key
    if (dbType === 'supabase') {
      dbConfig = {
        type:         'supabase',
        supabaseUrl:  process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey:  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      }
    }

    // MongoDB — requires connection string and database name
    else if (dbType === 'mongodb') {
      dbConfig = {
        type:             'mongodb',
        connectionString: process.env.NEXT_DB_MONGO_URI!,
        database:         process.env.NEXT_DB_MONGO_DB_NAME!,
      }
    }

    // MySQL — requires host, credentials, database name, and port
    else if (dbType === 'mysql') {
      dbConfig = {
        type:     'mysql',
        host:     process.env.NEXT_DB_MYSQL_HOST!,
        user:     process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
        port:     Number(process.env.NEXT_DB_MYSQL_PORT || 3306),
      }
    }

    // PostgreSQL — requires host, credentials, database name, and port
    else if (dbType === 'postgres') {
      dbConfig = {
        type:     'postgres',
        host:     process.env.NEXT_DB_POSTGRES_HOST!,
        user:     process.env.NEXT_DB_POSTGRES_USER!,
        password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
        database: process.env.NEXT_DB_POSTGRES_DB!,
        port:     Number(process.env.NEXT_DB_POSTGRES_PORT || 5432),
      }
    }

    else {
      throw new Error(`Unsupported NEXT_DB_TYPE: ${dbType}`)
    }

    // -----------------------------------------------------------------------
    // Step 4: Initialise the database adapter and verify required methods
    // -----------------------------------------------------------------------

    /**
     * `getAdapter()` returns a database-specific adapter instance that
     * implements a common interface for user/token operations.
     *
     * We check that the adapter exposes the two methods this route needs:
     * - `findUserByToken`      — Looks up a user by their reset token.
     * - `updatePasswordByToken` — Updates the password for the token's user.
     *
     * If either method is missing, the adapter is incomplete for this
     * operation and we throw a descriptive error immediately.
     */
    const adapter = getAdapter(dbType, dbConfig)

    if (!adapter.findUserByToken || !adapter.updatePasswordByToken) {
      throw new Error(`${dbType} adapter missing required methods`)
    }

    // -----------------------------------------------------------------------
    // Step 5: Validate the reset token
    // -----------------------------------------------------------------------

    /**
     * Look up the user associated with this reset token in the database.
     *
     * This will return null if:
     * - The token doesn't exist (was never issued or was already used).
     * - The token has expired (if the adapter enforces expiry).
     *
     * SECURITY: We do not log the token — only whether it was valid or not.
     */
    console.log('[reset-password] Validating reset token')
    const user = await adapter.findUserByToken(token)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Step 6: Hash the new password
    // -----------------------------------------------------------------------

    /**
     * Hash the user's new plain-text password using bcrypt before storing it.
     *
     * Why bcrypt?
     * - bcrypt is a one-way hashing algorithm designed specifically for
     *   passwords. Even if the database is compromised, the hashed passwords
     *   cannot be easily reversed to obtain the original passwords.
     *
     * Salt rounds = 10:
     * - The salt round value (10) controls how computationally expensive the
     *   hash is to compute. 10 is the industry standard — strong enough to
     *   resist brute-force attacks while still being fast enough for normal use.
     *
     * SECURITY: The raw `password` value is NEVER stored or logged — only
     * the resulting `hashedPassword` is passed to the adapter.
     */
    console.log('[reset-password] Hashing new password')
    const hashedPassword = await bcrypt.hash(password, 10)

    // -----------------------------------------------------------------------
    // Step 7: Update the password in the database
    // -----------------------------------------------------------------------

    /**
     * Pass the reset token and the new hashed password to the adapter.
     * The adapter uses the token to identify the correct user record and
     * updates their stored password hash.
     *
     * After this call, the token should be invalidated by the adapter
     * (consumed / deleted) so it cannot be reused for another reset.
     */
    await adapter.updatePasswordByToken(token, hashedPassword)

    console.log('[reset-password] Password reset completed successfully')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message — never the full error object, the token,
     * or the password, which could expose sensitive data in server logs.
     */
    console.error('[reset-password] Unexpected error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}