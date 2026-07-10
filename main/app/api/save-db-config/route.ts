/**
 * POST D:\NXTFLUTTER_CORE\NXTFlutter_Core\main\app\api\save-db-config\route.ts
 *
 * A Next.js API route that generates and writes a `.env.local` file to the
 * server's file system based on the database configuration collected during
 * the NXTFlutter installer wizard.
 *
 * This route is only meant to be called during the installation process in a
 * trusted server environment. It should NEVER be exposed as a public endpoint
 * in a production deployment, as it writes sensitive credentials to disk.
 *
 * What it does:
 * - Accepts a database config object in the request body.
 * - Validates and normalises the config values (adding https://, escaping
 *   special characters, extracting MongoDB database names, etc.).
 * - Generates a cryptographically secure API key secret.
 * - Writes a `.env.local` file at the project root containing all the
 *   environment variables needed for the selected database type.
 *
 * Supported database types (via `env.type`):
 * - mongodb   — Writes MongoDB URI and database name variables.
 * - mysql     — Writes MySQL host, port, user, password, and database variables.
 * - postgres  — Writes PostgreSQL host, port, user, password, and database variables.
 * - supabase  — Writes Supabase URL, anon key, service key, and storage URL.
 * - firebase  — Writes Firebase service account JSON and web config JSON.
 *
 * Request:
 * - Method:  POST
 * - Headers: Content-Type: application/json
 * - Body:    Database config object (shape depends on `type` field)
 *
 * Response (success):
 * - 200 { success: true, duration: any }
 *
 * Response (error):
 * - 500 { success: false, error: string }
 *
 * Security notes:
 * - Database passwords, connection strings, service account keys, and the
 *   generated API key secret are written to `.env.local` but are NEVER logged.
 * - The only console output is the file write path (logged at module load
 *   time) and a success confirmation after writing — no credential values.
 */

import { writeFile }  from 'fs/promises'
import path           from 'path'
import crypto         from 'crypto'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * ENV_FILE_PATH
 *
 * The absolute path where the `.env.local` file will be written.
 * Resolves to the root of the current working directory, which is the
 * Next.js project root when running in a standard Next.js environment.
 *
 * We log the resolved path at module load time so it's easy to confirm
 * the file is being written to the expected location during installation.
 */
const ENV_FILE_PATH = path.resolve(process.cwd(), '.env.local')
console.log('[write-env] Target .env.local path:', ENV_FILE_PATH)

// ---------------------------------------------------------------------------
// Safe value helpers
// ---------------------------------------------------------------------------

/**
 * envSafe
 *
 * Converts any value into a safely quoted string for use in a `.env` file.
 *
 * Rules:
 * - `undefined` or `null` → empty quoted string `""`
 * - Numbers              → unquoted numeric string (e.g. `3306`)
 * - Strings              → wrapped in double quotes with internal quotes escaped
 *
 * Why quote strings?
 * - Unquoted env values can break if they contain spaces, special characters,
 *   or `=` signs. Wrapping in quotes makes the file robust across all values.
 *
 * @param value - The value to format for the .env file.
 * @returns       A safely formatted string for a .env file line value.
 *
 * @example
 * envSafe('my"password')  // → '"my\\"password"'
 * envSafe(3306)            // → '3306'
 * envSafe(null)            // → '""'
 */
function envSafe(value: any): string {
  if (value === undefined || value === null) return '""'
  if (typeof value === 'number') return String(value)
  const str = String(value)
  return `"${str.replace(/"/g, '\\"')}"`
}

/**
 * ensureHttp
 *
 * Ensures a URL string starts with a valid HTTP scheme.
 * If the URL already starts with `http://` or `https://`, it is returned as-is.
 * Otherwise, `https://` is prepended.
 *
 * This prevents env values like `myproject.supabase.co` (without a scheme)
 * from being written to the file, which would cause fetch errors at runtime.
 *
 * @param url - The URL string to normalise.
 * @returns     The URL with a guaranteed `https://` or `http://` prefix.
 */
function ensureHttp(url: string): string {
  if (!url) return url
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}

/**
 * extractMongoDbName
 *
 * Extracts the database name from a MongoDB Atlas connection string.
 *
 * MongoDB URIs have the format:
 *   `mongodb+srv://user:pass@cluster.net/databaseName?options`
 *
 * This function extracts the `databaseName` portion between the last `/`
 * and the `?` query string. Falls back to the provided `fallback` value
 * or 'nxt_flutter' if extraction fails.
 *
 * @param uri      - The MongoDB connection string URI.
 * @param fallback - Optional fallback database name if extraction fails.
 * @returns         The extracted database name, or the fallback.
 */
function extractMongoDbName(uri: string, fallback?: string): string {
  try {
    const afterSlash = uri.split('.net/')[1] || ''
    const dbName     = afterSlash.split('?')[0]
    return dbName || fallback || 'nxt_flutter'
  } catch {
    return fallback || 'nxt_flutter'
  }
}

// ---------------------------------------------------------------------------
// JSON parsing helpers
// ---------------------------------------------------------------------------

/**
 * safeJsonParse
 *
 * Safely parses a value that may already be an object or a JSON string.
 *
 * Handles common issues found in user-pasted JSON:
 * - Trailing semicolons (`;`)
 * - Trailing commas before `}` or `]`
 *
 * Returns an empty object `{}` if input is falsy or not parseable.
 *
 * @param input - A JSON string, plain object, or any other value.
 * @returns       The parsed object, the original object, or `{}` on failure.
 */
function safeJsonParse(input: any): Record<string, any> {
  if (!input) return {}
  if (typeof input === 'object') return input
  if (typeof input !== 'string') return {}

  const cleaned = input
    .trim()
    .replace(/;\s*$/, '')    // Remove trailing semicolons
    .replace(/,\s*}/g, '}')  // Remove trailing commas before closing brace
    .replace(/,\s*]/g, ']')  // Remove trailing commas before closing bracket

  return JSON.parse(cleaned)
}

/**
 * normalizeServiceAccount
 *
 * Parses and normalises a Firebase service account JSON object.
 *
 * The main normalisation step is fixing the `private_key` field:
 * - Service account JSON pasted from the Firebase console often has literal
 *   `\n` escape sequences instead of real newline characters.
 * - The Node.js Firebase Admin SDK requires real newlines in the private key.
 *
 * @param input - A Firebase service account JSON string or object.
 * @returns       The parsed service account with a correctly formatted private_key.
 */
function normalizeServiceAccount(input: any): Record<string, any> {
  const obj = safeJsonParse(input)

  if (obj.private_key) {
    obj.private_key = String(obj.private_key)
      .replace(/\\n/g, '\n')   // Convert escaped \n to real newlines
      .replace(/\r\n/g, '\n')  // Normalise Windows line endings
  }

  return obj
}

// ---------------------------------------------------------------------------
// API key generator
// ---------------------------------------------------------------------------

/**
 * generateApiKeySecret
 *
 * Generates a cryptographically secure 32-character alphanumeric secret
 * for use as the `NXF_API_KEY_SECRET` environment variable.
 *
 * How it works:
 * - Generates 32 random bytes using Node.js `crypto.randomBytes()`.
 * - Maps each byte to a character from the alphanumeric charset using
 *   modulo to stay within the charset bounds.
 *
 * Why not use `.toString('hex')`?
 * - The installer spec requires exactly 32 characters (not 64 hex chars).
 * - Alphanumeric chars are safer across all environments than hex with padding.
 *
 * SECURITY: The generated secret is written to `.env.local` but is NEVER
 * logged to the console.
 *
 * @returns A 32-character alphanumeric random string.
 */
function generateApiKeySecret(): string {
  const chars   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result    = ''
  const bytes   = crypto.randomBytes(32)

  for (let i = 0; i < 32; i++) {
    result += chars[bytes[i] % chars.length]
  }

  return result
}

// ---------------------------------------------------------------------------
// Main env file writer
// ---------------------------------------------------------------------------

/**
 * writeEnvFileFromObject
 *
 * Builds and writes the `.env.local` file from the provided config object.
 *
 * Steps:
 * 1. Validates that the required `type` field is present.
 * 2. Writes global variables (DB type, app domain, API key secret).
 * 3. Writes database-specific variables based on `env.type`.
 * 4. Writes the file to `ENV_FILE_PATH`.
 *
 * SECURITY: Database passwords, connection strings, private keys, and the
 * generated API key secret are written to the file but never logged.
 *
 * @param env - The database config object from the installer request body.
 * @throws     If required fields for the selected database type are missing.
 */
async function writeEnvFileFromObject(env: Record<string, any>): Promise<void> {
  if (!env.type) throw new Error('Missing "type" in env payload')

  // Start the file with a generator comment
  const lines: string[] = ['# Generated by NXT_Flutter Installer']

  // -------------------------------------------------------------------------
  // Global variables — written for all database types
  // -------------------------------------------------------------------------

  /**
   * NEXT_DB_TYPE / NEXT_PUBLIC_DB_TYPE
   * Both server-side and client-side variants of the DB type are written
   * so all parts of the app can identify the active database adapter.
   */
  lines.push(`NEXT_DB_TYPE=${envSafe(env.type)}`)
  lines.push(`NEXT_PUBLIC_DB_TYPE=${envSafe(env.type)}`)

  /**
   * NEXT_PUBLIC_APP_DOMAIN
   * The public URL of the deployed app. Defaults to localhost:3000 for local
   * development. `ensureHttp` guarantees a valid URL scheme is present.
   */
  lines.push(
    `NEXT_PUBLIC_APP_DOMAIN=${envSafe(ensureHttp(env.domain || 'localhost:3000'))}`
  )

  /**
   * NXF_API_KEY_SECRET
   * A freshly generated secret used to sign and verify API keys.
   * SECURITY: Never logged — written directly to the file.
   */
  const apiKeySecret = generateApiKeySecret()
  const jwtAccessSecret  = crypto.randomBytes(48).toString("hex");
const jwtRefreshSecret = crypto.randomBytes(48).toString("hex");
  lines.push(`NXF_API_KEY_SECRET=${envSafe(apiKeySecret)}`)
lines.push(`JWT_ACCESS_SECRET=${envSafe(jwtAccessSecret)}`)
lines.push(`JWT_REFRESH_SECRET=${envSafe(jwtRefreshSecret)}`)
  // -------------------------------------------------------------------------
  // MongoDB variables
  // -------------------------------------------------------------------------

  if (env.type === 'mongodb') {
    /**
     * MongoDB requires a connection string (URI) at minimum.
     * The database name is extracted from the URI or falls back to the
     * explicitly provided `databaseName` or 'nxt_flutter'.
     */
    if (!env.connectionString) {
      throw new Error('MongoDB connectionString is required')
    }

    lines.push(`NEXT_DB_MONGO_URI=${envSafe(env.connectionString)}`)
    lines.push(
      `NEXT_DB_MONGO_DB_NAME=${envSafe(
        extractMongoDbName(env.connectionString, env.databaseName)
      )}`
    )
  }

  // -------------------------------------------------------------------------
  // MySQL variables
  // -------------------------------------------------------------------------

  if (env.type === 'mysql') {
    /**
     * MySQL requires all four connection fields.
     * Port defaults to 3306 (the standard MySQL port) if not provided.
     */
    if (!env.host || !env.database || !env.user || !env.password) {
      throw new Error('MySQL config missing required fields')
    }

    lines.push(`NEXT_DB_MYSQL_HOST=${envSafe(env.host)}`)
    lines.push(`NEXT_DB_MYSQL_PORT=${envSafe(env.port || 3306)}`)
    lines.push(`NEXT_DB_MYSQL_DATABASE=${envSafe(env.database)}`)
    lines.push(`NEXT_DB_MYSQL_USER=${envSafe(env.user)}`)
    lines.push(`NEXT_DB_MYSQL_PASSWORD=${envSafe(env.password)}`)
  }

  // -------------------------------------------------------------------------
  // PostgreSQL variables
  // -------------------------------------------------------------------------

  if (env.type === 'postgres') {
    /**
     * PostgreSQL requires all four connection fields.
     * Port defaults to 5432 (the standard PostgreSQL port) if not provided.
     */
    if (!env.host || !env.database || !env.user || !env.password) {
      throw new Error('Postgres config missing required fields')
    }

    lines.push(`NEXT_DB_POSTGRES_HOST=${envSafe(env.host)}`)
    lines.push(`NEXT_DB_POSTGRES_PORT=${envSafe(env.port || 5432)}`)
    lines.push(`NEXT_DB_POSTGRES_DATABASE=${envSafe(env.database)}`)
    lines.push(`NEXT_DB_POSTGRES_USER=${envSafe(env.user)}`)
    lines.push(`NEXT_DB_POSTGRES_PASSWORD=${envSafe(env.password)}`)
  }

  // -------------------------------------------------------------------------
  // Supabase variables
  // -------------------------------------------------------------------------

  if (env.type === 'supabase') {
  const url = env.supabaseUrl || env.url
  if (!url) throw new Error('Supabase URL missing')

  lines.push(`NEXT_PUBLIC_SUPABASE_URL=${envSafe(ensureHttp(url))}`)

  if (env.anonKey) {
    lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${envSafe(env.anonKey)}`)
  }

  if (env.serviceRoleKey) {
    lines.push(`NEXT_PUBLIC_SUPABASE_SERVICE_KEY=${envSafe(env.serviceRoleKey)}`)
  }

  if (env.storageUrl) {
    lines.push(`NEXT_DB_STORAGE_URL=${envSafe(ensureHttp(env.storageUrl))}`)
  }

  // ── NEW — write the direct Postgres connection string for DDL operations
  if (env.connectionString) {
    lines.push(`NEXT_DB_SUPABASE_CONNECTION_STRING=${envSafe(env.connectionString)}`)
  }
}

  // -------------------------------------------------------------------------
  // Firebase variables
  // -------------------------------------------------------------------------

  if (env.type === 'firebase') {
    /**
     * Firebase requires two JSON blobs:
     *
     * 1. `firebaseConfigJson` — The service account JSON (server-side admin SDK).
     *    Normalised to fix private_key newline encoding issues.
     *    Written as a single-line JSON string to NEXT_DB_FIREBASE_SERVICE_ACCOUNT.
     *
     * 2. `firebaseWebConfig` — The web app Firebase config (client-side SDK).
     *    Written as a single-line JSON string to NEXT_PUBLIC_FIREBASE_CONFIG.
     *
     * Additionally, the Firebase Storage bucket URL is derived from the
     * `storageBucket` field in the web config and written with the `gs://` prefix
     * required by the Firebase Storage SDK.
     *
     * SECURITY: Both JSON blobs may contain private keys and API keys.
     * They are written to the file but never logged.
     */
    const serviceAccount = normalizeServiceAccount(env.firebaseConfigJson)
    const webConfig      = safeJsonParse(env.firebaseWebConfig)

    lines.push(
      `NEXT_DB_FIREBASE_SERVICE_ACCOUNT=${envSafe(JSON.stringify(serviceAccount))}`
    )

    lines.push(
      `NEXT_PUBLIC_FIREBASE_CONFIG=${envSafe(JSON.stringify(webConfig))}`
    )

    if (env.firebaseDbType) {
      lines.push(`NEXT_DB_FIREBASE_DB_TYPE=${envSafe(env.firebaseDbType)}`)
    }

    /**
     * Firebase Storage URL — always written even if storageUrl isn't explicitly
     * provided, because it can be derived from `webConfig.storageBucket`.
     * The `gs://` prefix is required by the Firebase Admin Storage SDK.
     */
    lines.push(
      `NEXT_PUBLIC_FIREBASE_STORAGE_URL=${envSafe('gs://' + webConfig.storageBucket)}`
    )
  }

  // -------------------------------------------------------------------------
  // Write the file
  // -------------------------------------------------------------------------

  /**
   * Join all lines with newlines and write to `.env.local`.
   * The trailing `\n` ensures the file ends with a newline, which is
   * a POSIX convention and prevents issues with some env file parsers.
   */
  await writeFile(ENV_FILE_PATH, lines.join('\n') + '\n', 'utf-8')
  console.log('[write-env] .env.local written successfully')
}

// ---------------------------------------------------------------------------
// API route handler
// ---------------------------------------------------------------------------

/**
 * POST handler
 *
 * Parses the request body and delegates to `writeEnvFileFromObject`.
 * Returns a success response or a 500 with the error message.
 *
 * @param req - The incoming request containing the database config.
 * @returns    A Response with { success: true } or { success: false, error }.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    console.log(`[write-env] Writing .env.local for db type: ${body.type}`)
    const duration = await writeEnvFileFromObject(body)

    return new Response(
      JSON.stringify({ success: true, duration }),
      { status: 200 }
    )
  } catch (err: any) {
    /**
     * Log only the error message — never the request body which may
     * contain passwords, connection strings, or private keys.
     */
    console.error('[write-env] Failed to write .env.local:', err.message)

    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    )
  }
}