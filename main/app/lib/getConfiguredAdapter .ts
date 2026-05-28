/**
 * storageAdapter.ts
 *
 * A factory module that reads environment variables to determine which
 * database the application is configured to use, then builds the correct
 * configuration object and returns the matching database adapter.
 *
 * What is a "storage adapter"?
 *   The rest of the application never talks to a database directly. Instead
 *   it calls methods on an adapter object (e.g. adapter.getUser(), 
 *   adapter.saveRecord()). Each adapter speaks the language of one specific
 *   database (Firebase, Supabase, MongoDB, etc.) but exposes the same
 *   interface to the rest of the app. This pattern is called the Adapter
 *   Pattern and it means you can swap databases by changing one environment
 *   variable without touching any other code.
 *
 * How the correct adapter is chosen:
 *   The environment variable NEXT_PUBLIC_DB_TYPE determines which branch
 *   runs. Supported values are:
 *     'firebase'  — Google Firebase / Firestore
 *     'supabase'  — Supabase (Postgres-based BaaS)
 *     'mongodb'   — MongoDB Atlas or self-hosted MongoDB
 *     'mysql'     — Any MySQL-compatible server
 *     'postgres'  — Any PostgreSQL-compatible server
 *
 * Exports:
 *   getStorageAdapter() — call this wherever you need a database adapter.
 *                         Returns an adapter instance ready to use.
 */

import { getAdapter }                                          from '@/app/db-adapter'
import { DBConfig, DBType }                                    from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'

// ---------------------------------------------------------------------------
// getStorageAdapter
// ---------------------------------------------------------------------------

/**
 * getStorageAdapter
 *
 * Reads NEXT_PUBLIC_DB_TYPE from the environment, collects all the
 * database-specific environment variables for that type, and returns
 * a fully initialised database adapter.
 *
 * Calling pattern:
 *   This function is typically called once per API route or server action,
 *   at the point where a database operation is needed:
 *
 *     const db = getStorageAdapter()
 *     const user = await db.getUser(userId)
 *
 * Environment variables consumed (by database type):
 *
 *   All types:
 *     NEXT_PUBLIC_DB_TYPE                    — which database to use
 *
 *   firebase:
 *     NEXT_DB_FIREBASE_SERVICE_ACCOUNT       — service account JSON (server-only)
 *     NEXT_PUBLIC_FIREBASE_CONFIG            — web SDK config JSON
 *     NEXT_PUBLIC_FIREBASE_STORAGE_URL       — Cloud Storage bucket URL
 *
 *   supabase:
 *     NEXT_PUBLIC_SUPABASE_URL               — Supabase project URL
 *     NEXT_PUBLIC_SUPABASE_SERVICE_KEY       — Supabase service-role API key
 *
 *   mongodb:
 *     NEXT_DB_MONGO_URI                      — full MongoDB connection string
 *     NEXT_DB_MONGO_DB_NAME                  — name of the database to use
 *
 *   mysql:
 *     NEXT_DB_MYSQL_HOST                     — hostname or IP of the MySQL server
 *     NEXT_DB_MYSQL_USER                     — database username
 *     NEXT_DB_MYSQL_PASSWORD                 — database password
 *     NEXT_DB_MYSQL_DATABASE                 — name of the database to use
 *     NEXT_DB_MYSQL_PORT                     — port number (default: 3306)
 *
 *   postgres:
 *     NEXT_DB_POSTGRES_HOST                  — hostname or IP of the Postgres server
 *     NEXT_DB_POSTGRES_USER                  — database username
 *     NEXT_DB_POSTGRES_PASSWORD              — database password
 *     NEXT_DB_POSTGRES_DATABASE              — name of the database to use
 *     NEXT_DB_POSTGRES_PORT                  — port number (default: 5432)
 *
 * @returns {Adapter} A database adapter instance whose methods can be called
 *                    to perform database operations throughout the application.
 *
 * @throws {Error} 'Firebase service account missing'
 *                  — NEXT_DB_FIREBASE_SERVICE_ACCOUNT is not set.
 * @throws {Error} 'Unsupported DB type: <value>'
 *                  — NEXT_PUBLIC_DB_TYPE is set to an unrecognised value,
 *                    or is missing entirely (in which case value is undefined).
 */
export function getConfiguredAdapter() {
  /**
   * dbType — which database engine to connect to.
   * Cast to the DBType union so TypeScript can check it against the known
   * values ('firebase' | 'supabase' | 'mongodb' | 'mysql' | 'postgres').
   */
  const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType

  /**
   * dbConfig — the configuration object passed to getAdapter().
   * Each branch below assigns a different shape of this object depending
   * on which database type is active. The DBConfig type is a discriminated
   * union, meaning TypeScript knows exactly which fields are valid for each
   * `type` value.
   *
   * Declared with `let` (not `const`) because it is assigned inside a
   * conditional branch rather than at the point of declaration.
   */
  let dbConfig: DBConfig

  // -------------------------------------------------------------------------
  // Firebase
  // -------------------------------------------------------------------------
  if (dbType === 'firebase') {
    /**
     * Firebase requires two separate credentials:
     *
     * 1. Service account (NEXT_DB_FIREBASE_SERVICE_ACCOUNT)
     *    A JSON file downloaded from the Firebase console. It contains a
     *    private key used by the Firebase Admin SDK on the server to make
     *    privileged calls (bypassing security rules). This must NEVER be
     *    exposed to the browser — note the absence of NEXT_PUBLIC_ prefix.
     *
     * 2. Web config (NEXT_PUBLIC_FIREBASE_CONFIG)
     *    A JSON object from the Firebase console that identifies the project
     *    (apiKey, projectId, etc.). This is safe to expose to the browser,
     *    hence the NEXT_PUBLIC_ prefix.
     *
     * Both values are stored as raw JSON strings in the environment and
     * require parsing (see firebaseConfig.ts for details on why simple
     * JSON.parse is not always sufficient).
     */
    const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
    const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

    if (!serviceAccount) throw new Error('Firebase service account missing')

    // Parse both JSON strings into usable objects.
    const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
    const parsedConfig  = parseFirebaseWebConfig(configAccount)

    dbConfig = {
      type: 'firebase',
      /**
       * firebaseConfigJson — the Admin SDK expects the service account as a
       * JSON string (not an object), so we re-serialise it after parsing.
       * Parsing first ensures any escaping issues are resolved before
       * handing it to the adapter.
       */
      firebaseConfigJson: JSON.stringify(parsedAccount),
      storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,
    }

  // -------------------------------------------------------------------------
  // Supabase
  // -------------------------------------------------------------------------
  } else if (dbType === 'supabase') {
    /**
     * Supabase only needs two values:
     *   - The project URL (identifies which Supabase project to connect to).
     *   - The service-role key (grants full database access, bypassing RLS).
     *
     * The ! (non-null assertion) tells TypeScript we are confident these
     * variables are set. In production you would want to add explicit checks
     * and throw descriptive errors, similar to the Firebase branch above.
     */
    dbConfig = {
      type:        'supabase',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey:     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
    }

  // -------------------------------------------------------------------------
  // MongoDB
  // -------------------------------------------------------------------------
  } else if (dbType === 'mongodb') {
    /**
     * MongoDB uses a single connection string (URI) that encodes the host,
     * port, credentials, and optional settings all in one value, e.g.:
     *   mongodb+srv://user:password@cluster.mongodb.net
     *
     * The database name is provided separately because the same connection
     * can technically reach multiple databases on the same server.
     */
    dbConfig = {
      type:             'mongodb',
      connectionString: process.env.NEXT_DB_MONGO_URI!,
      database:         process.env.NEXT_DB_MONGO_DB_NAME!,
    }

  // -------------------------------------------------------------------------
  // MySQL
  // -------------------------------------------------------------------------
  } else if (dbType === 'mysql') {
    /**
     * MySQL (and compatible databases like MariaDB, PlanetScale) uses
     * individual connection parameters rather than a single URI string.
     *
     * Port defaults to 3306 if not specified — this is the standard MySQL
     * port. Number() converts the string env value to a number because
     * all process.env values are strings but the adapter expects a number.
     */
    dbConfig = {
      type:     'mysql',
      host:     process.env.NEXT_DB_MYSQL_HOST!,
      user:     process.env.NEXT_DB_MYSQL_USER!,
      password: process.env.NEXT_DB_MYSQL_PASSWORD!,
      database: process.env.NEXT_DB_MYSQL_DATABASE!,
      port:     Number(process.env.NEXT_DB_MYSQL_PORT ?? 3306),
    }

  // -------------------------------------------------------------------------
  // PostgreSQL
  // -------------------------------------------------------------------------
  } else if (dbType === 'postgres') {
    /**
     * PostgreSQL uses the same individual-parameter approach as MySQL.
     *
     * Port defaults to 5432 if not specified — this is the standard
     * PostgreSQL port.
     */
    dbConfig = {
      type:     'postgres',
      host:     process.env.NEXT_DB_POSTGRES_HOST!,
      user:     process.env.NEXT_DB_POSTGRES_USER!,
      password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
      database: process.env.NEXT_DB_POSTGRES_DATABASE!,
      port:     Number(process.env.NEXT_DB_POSTGRES_PORT ?? 5432),
    }

  // -------------------------------------------------------------------------
  // Unsupported type
  // -------------------------------------------------------------------------
  } else {
    /**
     * If NEXT_PUBLIC_DB_TYPE is set to an unrecognised value (or is not set
     * at all, in which case dbType is undefined), we throw a descriptive
     * error that includes the actual value received. This makes it much
     * easier to diagnose misconfigured deployments than a generic
     * "cannot read property of undefined" error would.
     */
    throw new Error(`Unsupported DB type: ${dbType}`)
  }

  // -------------------------------------------------------------------------
  // Return the adapter
  // -------------------------------------------------------------------------

  /**
   * getAdapter(dbType, dbConfig)
   *
   * Constructs and returns the correct adapter instance.
   * From this point the caller works exclusively with the adapter's methods
   * and never needs to know which database is running underneath.
   */
  return getAdapter(dbType, dbConfig)
}