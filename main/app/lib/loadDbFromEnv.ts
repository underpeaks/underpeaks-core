/**
 * loadDbFromEnv.ts
 *
 * A utility module responsible for reading database configuration from
 * environment variables and returning a typed DBConfig object that the
 * rest of the application can use to initialise a database adapter.
 *
 * How it fits into the bigger picture:
 *   This file sits between your environment variables (.env file or hosting
 *   dashboard) and the database adapter layer. Rather than scattering
 *   process.env reads across many files, all database-related environment
 *   reading is centralised here. This means:
 *     • There is one place to look when a database connection isn't working.
 *     • Every env var is validated before the app tries to use it.
 *     • TypeScript knows exactly which shape the returned config will be,
 *       because DBConfig is a discriminated union (one shape per DB type).
 *
 * Supported database types (set via NEXT_DB_TYPE):
 *   'firebase'  — Google Firebase / Firestore + Cloud Storage
 *   'postgres'  — PostgreSQL (any provider: Neon, Railway, self-hosted, etc.)
 *   'mongodb'   — MongoDB (Atlas or self-hosted)
 *   'supabase'  — Supabase (Postgres-based BaaS)
 *   'mysql'     — MySQL or compatible (MariaDB, PlanetScale, etc.)
 *
 * Internal helpers (not exported):
 *   getDbType(value)         — validates NEXT_DB_TYPE and returns it as DBType.
 *   parseJsonEnv(value,name) — parses a JSON string env var with clear errors.
 *
 * Exports:
 *   loadDbFromEnv() — reads all env vars for the active DB type and returns
 *                     a fully typed DBConfig object.
 */

import { DBConfig, DBType } from '@/app/db-adapter/types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * getDbType
 *
 * Validates that the given string is one of the supported database type
 * identifiers and returns it cast to the DBType union type.
 *
 * Why a switch instead of a simple array check:
 *   Using a switch with explicit cases lets TypeScript narrow the return
 *   type to the exact DBType union. A generic array.includes() check would
 *   return a plain boolean and require a separate cast.
 *
 * @param {string} [value] - The raw value of the NEXT_DB_TYPE environment
 *                           variable. Marked optional because process.env
 *                           lookups return undefined when the variable is
 *                           not set.
 * @returns {DBType}         The validated database type string.
 *
 * @throws {Error} If `value` is undefined, empty, or not one of the five
 *                 supported type strings. The error message includes the
 *                 actual value received to help diagnose typos in .env files.
 */
function getDbType(value?: string): DBType {
  switch (value) {
    case 'firebase':
    case 'postgres':
    case 'mongodb':
    case 'supabase':
    case 'mysql':
      return value
    default:
      throw new Error(`Invalid or missing NEXT_DB_TYPE: ${value}`)
  }
}

/**
 * parseJsonEnv
 *
 * Reads a JSON string from an environment variable and parses it into a
 * typed JavaScript object.
 *
 * Why this helper exists:
 *   Some database configs (notably Firebase) are stored as JSON strings in
 *   environment variables. JSON.parse throws a generic SyntaxError that
 *   doesn't tell you *which* variable is broken. This helper wraps the
 *   parse with a descriptive error that names the problematic variable,
 *   making misconfiguration much easier to diagnose.
 *
 * Generic type parameter T:
 *   Callers can optionally specify the expected return type, e.g.:
 *     parseJsonEnv<FirebaseServiceAccount>(raw, 'NEXT_DB_FIREBASE_SERVICE_ACCOUNT')
 *   If omitted, T defaults to `any`.
 *
 * @param {string} [value] - The raw JSON string from the environment variable.
 * @param {string} [name]  - The name of the environment variable (used only
 *                           in error messages to identify which variable failed).
 * @returns {T}              The parsed object cast to type T.
 *
 * @throws {Error} 'Missing <name> in environment'   — if value is undefined or empty.
 * @throws {Error} '<name> is not valid JSON'         — if JSON.parse fails.
 */
function parseJsonEnv<T = any>(value?: string, name?: string): T {
  if (!value) throw new Error(`Missing ${name} in environment`)
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${name} is not valid JSON`)
  }
}

// ---------------------------------------------------------------------------
// loadDbFromEnv
// ---------------------------------------------------------------------------

/**
 * loadDbFromEnv
 *
 * Reads the NEXT_DB_TYPE environment variable to determine which database
 * is configured, then collects and validates all the environment variables
 * required for that database type, and returns a fully typed DBConfig object.
 *
 * This is the only function that should be called by the rest of the app.
 * The two helpers above are implementation details used only inside here.
 *
 * Usage:
 *   import { loadDbFromEnv } from '@/app/lib/loadDbFromEnv'
 *   const config = loadDbFromEnv()
 *   const adapter = getAdapter(config.type, config)
 *
 * Environment variables consumed (by database type):
 *
 *   All types:
 *     NEXT_DB_TYPE                           — which database to use
 *
 *   firebase:
 *     NEXT_DB_FIREBASE_SERVICE_ACCOUNT       — service account JSON (server-only)
 *     NEXT_PUBLIC_FIREBASE_CONFIG            — web SDK config JSON
 *     NEXT_DB_FIREBASE_STORAGE_BUCKET        — Cloud Storage bucket name
 *                                              (the function prepends 'gs://')
 *
 *   postgres:
 *     NEXT_DB_POSTGRES_URL                   — full connection URL, e.g.
 *                                              postgresql://user:pass@host/db
 *
 *   mongodb:
 *     NEXT_DB_MONGODB_URI                    — full connection URI, e.g.
 *                                              mongodb+srv://user:pass@cluster/db
 *
 *   supabase:
 *     NEXT_DB_SUPABASE_URL                   — Supabase project URL
 *     NEXT_DB_SUPABASE_SERVICE_KEY           — Supabase service-role API key
 *
 *   mysql:
 *     NEXT_DB_MYSQL_HOST                     — hostname or IP of the MySQL server
 *     NEXT_DB_MYSQL_USER                     — database username
 *     NEXT_DB_MYSQL_PASSWORD                 — database password
 *     NEXT_DB_MYSQL_DATABASE                 — name of the database to use
 *
 * @returns {DBConfig} A discriminated union config object whose shape depends
 *                     on the active database type. TypeScript will narrow the
 *                     type automatically when you check config.type.
 *
 * @throws {Error} 'Invalid or missing NEXT_DB_TYPE: <value>'
 *                  — NEXT_DB_TYPE is missing or not a recognised value.
 * @throws {Error} 'Missing NEXT_DB_FIREBASE_SERVICE_ACCOUNT'
 *                  — required Firebase env var is not set.
 * @throws {Error} 'Missing NEXT_PUBLIC_FIREBASE_CONFIG'
 *                  — required Firebase env var is not set.
 * @throws {Error} 'Unhandled DB type: <value>'
 *                  — TypeScript exhaustiveness guard; should never be reached
 *                    in practice if getDbType() is working correctly.
 */
export function loadDbFromEnv(): DBConfig {
  /**
   * Validate NEXT_DB_TYPE first. If this throws, none of the branches below
   * run, and the developer gets a clear error pointing to the root cause.
   */
  const type = getDbType(process.env.NEXT_DB_TYPE)

  switch (type) {

    // -----------------------------------------------------------------------
    // Firebase
    // -----------------------------------------------------------------------
    case 'firebase': {
      /**
       * Firebase requires two separate JSON credentials:
       *
       * 1. Service account (server-only, no NEXT_PUBLIC_ prefix):
       *    A private key JSON downloaded from the Firebase console.
       *    Used by the Firebase Admin SDK to make privileged server-side calls.
       *    Must NEVER be sent to the browser.
       *
       * 2. Web config (public, NEXT_PUBLIC_ prefix):
       *    A plain config object (apiKey, projectId, etc.) used to initialise
       *    the Firebase JS SDK in the browser. Safe to expose publicly.
       *
       * Storage bucket:
       *    The bucket name stored in env (e.g. 'my-app.appspot.com') is
       *    prefixed with 'gs://' here to produce the full URI that the
       *    Firebase Admin Storage SDK expects.
       */
      const firebaseServiceAccountJson =
        process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const firebaseWebConfigJson =
        process.env.NEXT_PUBLIC_FIREBASE_CONFIG

      if (!firebaseServiceAccountJson)
        throw new Error('Missing NEXT_DB_FIREBASE_SERVICE_ACCOUNT')
      if (!firebaseWebConfigJson)
        throw new Error('Missing NEXT_PUBLIC_FIREBASE_CONFIG')

      return {
        type,
        firebaseConfigJson: firebaseServiceAccountJson,
        firebaseWebConfig:  firebaseWebConfigJson,
        // Prepend the 'gs://' scheme required by the Firebase Storage SDK.
        storageBucket: 'gs://' + process.env.NEXT_DB_FIREBASE_STORAGE_BUCKET,
      }
    }

    // -----------------------------------------------------------------------
    // PostgreSQL
    // -----------------------------------------------------------------------
    case 'postgres':
      /**
       * Postgres only needs a single connection URL that encodes all
       * connection details (host, port, user, password, database name).
       * Example: postgresql://alice:secret@db.example.com:5432/myapp
       *
       * The ! (non-null assertion) tells TypeScript we are confident the
       * variable is set. Consider adding an explicit check and descriptive
       * error if you want parity with the Firebase branch above.
       */
      return { type, url: process.env.NEXT_DB_POSTGRES_URL! }

    // -----------------------------------------------------------------------
    // MongoDB
    // -----------------------------------------------------------------------
    case 'mongodb':
      /**
       * MongoDB also uses a single connection URI.
       * Example: mongodb+srv://user:pass@cluster0.mongodb.net/mydb
       */
      return { type, uri: process.env.NEXT_DB_MONGODB_URI! }

    // -----------------------------------------------------------------------
    // Supabase
    // -----------------------------------------------------------------------
    case 'supabase':
      /**
       * Supabase needs the project URL and the service-role key.
       * The service-role key bypasses Row Level Security (RLS) and grants
       * full database access — keep it server-side only.
       */
      return {
        type,
        supabaseUrl:        process.env.NEXT_DB_SUPABASE_URL!,
        supabaseServiceKey: process.env.NEXT_DB_SUPABASE_SERVICE_KEY!,
      }

    // -----------------------------------------------------------------------
    // MySQL
    // -----------------------------------------------------------------------
    case 'mysql':
      /**
       * MySQL uses individual connection parameters rather than a URI.
       * Compatible with MariaDB, PlanetScale, and other MySQL-protocol
       * databases without any changes to this configuration.
       */
      return {
        type,
        host:     process.env.NEXT_DB_MYSQL_HOST!,
        user:     process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
      }

    // -----------------------------------------------------------------------
    // Exhaustiveness guard
    // -----------------------------------------------------------------------
    default:
      /**
       * TypeScript's exhaustiveness check — if a new DBType value is ever
       * added to the union but this switch is not updated, TypeScript will
       * surface a compile-time error here rather than allowing a silent
       * runtime failure. In production this branch should never be reached
       * because getDbType() above would have already thrown.
       */
      throw new Error(`Unhandled DB type: ${type}`)
  }
}