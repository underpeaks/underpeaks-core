/**
 * API Route: POST /api/test-db-connection
 *
 * A server-side endpoint that tests whether a database connection can be
 * established using the configuration provided in the request body.
 *
 * This route is typically used during the installer wizard to verify that
 * the database credentials the user entered are correct before the installer
 * proceeds to write any data.
 *
 * What this route does:
 * 1. Reads a DBConfig object from the JSON request body. This object contains
 *    all the information needed to connect to a database — type, host, port,
 *    credentials, etc.
 * 2. Resolves the correct database adapter for the given database type
 *    (e.g. Firebase, Supabase, MySQL, Postgres, MongoDB).
 * 3. Calls the adapter's testConnection method to attempt a real connection.
 * 4. Returns the result of the test — typically { success: true/false, message }.
 *
 * Authentication: None — this route is intentionally public because it is
 *                 called during the installer before any auth system exists.
 * Method:         POST
 * Body:           DBConfig object (type, host, port, credentials, etc.)
 * Success:        { success: true, message?: string }
 * Errors:         { success: false, message: string } with status 500
 *
 * IMPORTANT: This route is NOT marked 'server-only' because it does not import
 * any server-only modules directly. However, it should never be called from
 * client-side code — database credentials must never pass through the browser.
 * The route handler itself runs exclusively on the server by virtue of being
 * inside the /api directory.
 */

import { getAdapter }    from '@/app/db-adapter'
import { DBConfig }      from '@/app/db-adapter/types'
import { NextResponse }  from 'next/server'
import { getTranslations } from 'next-intl/server'

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Tests a database connection using the provided configuration.
 * See the file-level JSDoc above for the full description.
 *
 * @param req - The incoming request. The JSON body must be a valid DBConfig
 *              object containing at minimum a `type` field and the credentials
 *              required for that database type.
 * @returns A NextResponse with the connection test result on success,
 *          or { success: false, message: string } on failure.
 */
export async function POST(req: Request) {
  /**
   * t — Server-side translation function scoped to the 'testDbConnection' namespace.
   * Used for all user-facing error messages returned by this route.
   */
 // const t = await getTranslations('testDbConnection')

  try {
    // ── Parse request body ─────────────────────────────────────────────────

    /**
     * Parse the incoming JSON body into a DBConfig object.
     * DBConfig contains all the fields needed to connect to a database —
     * for example:
     *   {
     *     type:     'postgres',
     *     host:     'localhost',
     *     port:     5432,
     *     database: 'myapp',
     *     user:     'admin',
     *     password: '...'
     *   }
     *
     * The exact shape depends on the database type — each adapter defines
     * which fields it requires.
     */
    const config: DBConfig = await req.json()

    // ── Resolve database adapter ───────────────────────────────────────────

    /**
     * getAdapter — Returns the correct database adapter instance for the
     * given database type (e.g. 'firebase', 'supabase', 'mysql', 'postgres',
     * 'mongodb'). Each adapter knows how to connect to and interact with its
     * specific database engine.
     *
     * We pass both the type and the full config so the adapter can initialise
     * its connection client with the provided credentials.
     */
    const adapter = getAdapter(config.type, config)

    // ── Test the connection ────────────────────────────────────────────────

    /**
     * Call the adapter's testConnection method to attempt a real connection
     * to the database using the provided credentials.
     *
     * The `!` after adapter.testConnection asserts that the method exists —
     * if the adapter does not implement testConnection, this will throw and
     * be caught by the outer try/catch below.
     *
     * The result is typically shaped like:
     *   { success: true }  — connection succeeded
     *   { success: false, message: 'reason' }  — connection failed cleanly
     */
    const result = await adapter.testConnection!()

    /**
     * Return the adapter's test result directly to the client.
     * The installer UI uses this to show a success or failure message.
     */
    return NextResponse.json(result)

  } catch {
    /**
     * Catch-all for unexpected errors such as:
     * - JSON parse failure (malformed request body)
     * - Unknown database type passed to getAdapter
     * - testConnection throwing instead of returning a result
     * - Network-level errors during the connection attempt
     *
     * We return a generic failure message rather than the raw error —
     * error messages from database drivers often contain connection strings,
     * hostnames, usernames, or internal driver details that should not be
     * sent back to the client.
     */
    return NextResponse.json(
      { success: false, message: ('errors.connectionFailed') },
      { status: 500 }
    )
  }
}