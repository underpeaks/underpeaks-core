// app/api/get-db-config/route.ts

/**
 * GET /api/get-db-config
 *
 * Next.js App Router API route that retrieves the system configuration record
 * for a specific user from the database.
 *
 * What is "system config"?
 * ─────────────────────────
 * The system config is a per-user record stored in the database that holds
 * the runtime configuration for that user's NXT_Flutter project — for example,
 * their branding settings, feature flags, active modules, and project metadata.
 * It is loaded by ConsoleLayout on every session refresh and stored in the
 * Zustand console store so all console pages can read it.
 *
 * Why is DB config built here from environment variables?
 * ───────────────────────────────────────────────────────
 * Unlike installer routes (which receive DB config in the request body because
 * the database has not been set up yet), runtime routes read DB credentials
 * from environment variables. By the time this route is called, the installer
 * has already written the credentials to the server environment.
 *
 * Currently supported database types:
 * ─────────────────────────────────────
 * Firebase — config is assembled from NEXT_DB_FIREBASE_SERVICE_ACCOUNT and
 *            NEXT_PUBLIC_FIREBASE_CONFIG environment variables.
 *
 * (Supabase and other adapters are planned — see the inline note below.)
 *
 * Query parameters:
 * ─────────────────
 *   user_id {string} — The ID of the user whose system config should be
 *                      fetched. Required.
 *
 * Responses:
 * ──────────
 *   200 { config: object | null } — Config record found and returned, or null
 *                                   if no config exists for this user yet.
 *   400 { config: null }          — user_id query parameter is missing.
 *   500 { config: null }          — Unexpected server error (DB connection
 *                                   failure, unsupported DB type, etc.).
 */

import { getAdapter }            from '@/app/db-adapter'
import { DBConfig, DBType }      from '@/app/db-adapter/types'
import {
  parseFirebaseServiceAccount,
  parseFirebaseWebConfig,
}                                from '@/app/lib/firebaseConfig'
import { NextResponse }          from 'next/server'
import { NextRequest }           from 'next/server'
import { getTranslations }       from 'next-intl/server'

/**
 * GET
 *
 * Handles GET requests to /api/system-config.
 * Resolves the correct DB adapter, fetches the system config for the given
 * user, and returns it as JSON.
 *
 * @param req — The incoming Next.js API request. Must include a `user_id`
 *              query parameter.
 * @returns A NextResponse containing { config } where config is the user's
 *          system configuration object, or null if not found or on error.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  

  try {

    /**
   * t — Server-side translation function scoped to the 'systemConfigRoute'
   * namespace. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
 // const t = await getTranslations('systemConfigRoute')
    // -----------------------------------------------------------------------
    // Read environment and query parameters
    // -----------------------------------------------------------------------

    /**
     * dbType — the database backend this server is configured to use.
     * Read from an environment variable rather than the request so the client
     * cannot influence which adapter is resolved.
     */
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType

    /**
     * userId — the ID of the user whose system config is being requested.
     * Passed as a query parameter by ConsoleLayout's refreshSession() call.
     */
    const userId = req.nextUrl.searchParams.get('user_id')

    /**
     * dbConfig — populated in the DB-type branch below before being passed
     * to getAdapter(). Declared here so it is in scope for the adapter call.
     */
    let dbConfig: DBConfig

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * user_id is required — without it we have no way to scope the config
     * query to the correct user. Return 400 with config: null (rather than
     * an error string) to match the shape the caller expects in all cases.
     */
    if (!userId) {
      return NextResponse.json({ config: null }, { status: 400 })
    }

    // -----------------------------------------------------------------------
    // Build DB config from environment variables
    // -----------------------------------------------------------------------

    if (dbType === 'firebase') {
      /**
       * Firebase requires two pieces of configuration:
       *
       * 1. Service account JSON (NEXT_DB_FIREBASE_SERVICE_ACCOUNT)
       *    The full Firebase Admin SDK service account, used server-side to
       *    authenticate with Firebase services. parseFirebaseServiceAccount()
       *    handles both raw JSON strings and escaped variants.
       *
       * 2. Web config (NEXT_PUBLIC_FIREBASE_CONFIG)
       *    The client-side Firebase config object. We read storageBucket from
       *    it to build the full gs:// storage URL required by the adapter.
       */
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

      if (!serviceAccount) throw new Error(('errors.firebaseServiceAccountMissing'))

      const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
     const parsedConfig = parseFirebaseWebConfig(configAccount)



dbConfig = {
  type:               'firebase',
  firebaseConfigJson: JSON.stringify(parsedAccount),
   storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,
}
      /*
       * NOTE — Additional database types (Supabase, PostgreSQL, MySQL, MongoDB)
       * ─────────────────────────────────────────────────────────────────────────
       * Support for other adapters is planned. When adding a new DB type:
       *   1. Add an `else if (dbType === '<type>')` branch here.
       *   2. Build the dbConfig from the appropriate environment variables.
       *   3. Ensure the adapter implements findSystemConfigByUserId().
       *
       * Example Supabase branch (not yet active):
       *   else if (dbType === 'supabase') {
       *     dbConfig = {
       *       type:        'supabase',
       *       supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
       *       anonKey:     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
       *     }
       *   }
       */

    } else {
      /**
       * Any DB type not handled above is not yet supported by this route.
       * Throwing here causes the catch block to return a 500 with config: null.
       */
      throw new Error('errors.unsupportedDbType')
    }

    // -----------------------------------------------------------------------
    // Resolve adapter and fetch config
    // -----------------------------------------------------------------------

    /**
     * getAdapter() returns the correct DBAdapter implementation for the
     * resolved dbType, initialised with the dbConfig built above.
     */
    const adapter = getAdapter(dbType, dbConfig)

    /**
     * findSystemConfigByUserId() fetches the system config record for the
     * given user from the database. The non-null assertion (!) is safe here
     * because we have already verified dbType is 'firebase', which is known
     * to implement this method. When additional DB types are added, ensure
     * their adapters also implement findSystemConfigByUserId() before using
     * this route with them.
     *
     * Returns the config object if found, or null/undefined if no config
     * record exists yet for this user (e.g. on first login after install).
     */
    const config = await adapter.findSystemConfigByUserId!(adapter.config, userId)

    /**
     * Normalise undefined to null so the response shape is always
     * { config: object } or { config: null } — never { config: undefined }.
     */
    return NextResponse.json({ config: config ?? null })

  } catch (err: any) {
    /**
     * Catch-all for unexpected errors — DB connection failures, missing env
     * vars, unsupported DB type, or adapter method errors. Returns config: null
     * with a 500 so the caller can handle the failure gracefully without
     * crashing (ConsoleLayout treats a null config as "use defaults").
     */
    console.error('logs.systemConfigError', err)
    return NextResponse.json({ config: null }, { status: 500 })
  }
}