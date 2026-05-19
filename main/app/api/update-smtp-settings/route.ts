import 'server-only'

/**
 * API Route: POST /api/settings/update-smtp
 *
 * A server-side endpoint that saves SMTP (email) configuration for a given
 * user's system config record, and mirrors those settings into the local
 * .env.local file so they are available as environment variables.
 *
 * What this route does:
 * 1. Reads all SMTP-related fields from the JSON request body.
 * 2. Validates that user_id is present.
 * 3. Builds the correct database config based on the configured DB type
 *    (currently only Firebase is supported).
 * 4. Looks up the existing system config record for the given user_id.
 *    Returns 404 if no record is found.
 * 5. Derives a deterministic AES-256-GCM encryption key from the user's
 *    system config identifiers so the SMTP password is never stored in
 *    plain text in the database.
 * 6. Builds the SMTP update payload — if a password was provided, it is
 *    encrypted before being included in the payload.
 * 7. Writes the update to the nxf_system_config record in the database.
 * 8. Patches .env.local with all non-sensitive SMTP values so they are
 *    available at runtime. The raw SMTP password is written to a
 *    server-only env variable (NEXT_SMTP_PASSWORD) — not a NEXT_PUBLIC_
 *    variable — so it is never bundled into the browser.
 *
 * Authentication: None enforced at this layer (handled upstream/middleware)
 * Method:         POST
 * Body:           {
 *                   user_id:         string  (required),
 *                   verify_email:    boolean (optional),
 *                   forgot_password: boolean (optional),
 *                   smtp_enabled:    boolean (optional),
 *                   host:            string  (optional),
 *                   port:            string  (optional),
 *                   from_address:    string  (optional),
 *                   username:        string  (optional),
 *                   password:        string  (optional),
 *                   encryption:      string  (optional),
 *                 }
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures SMTP credentials, encryption keys, and filesystem access
 * are never exposed to the browser.
 */

import { NextRequest, NextResponse }                            from 'next/server'
import { getTranslations }                                      from 'next-intl/server'
import { getAdapter }                                           from '@/app/db-adapter'
import { DBConfig, DBType }                                     from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'
import crypto                                                   from 'crypto'
import fs                                                       from 'fs'
import path                                                     from 'path'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * IV_LENGTH — The byte length of the Initialisation Vector (IV) used in
 * AES-256-GCM encryption. 16 bytes (128 bits) is the standard size for GCM.
 * A new random IV is generated for every encryption operation so that the
 * same plaintext never produces the same ciphertext.
 */
const IV_LENGTH = 16

// ---------------------------------------------------------------------------
// Helper: derive encryption key
// ---------------------------------------------------------------------------

/**
 * deriveEncryptionKey
 *
 * Produces a deterministic 32-byte (256-bit) AES encryption key from four
 * pieces of information that are unique to this user's system config record.
 *
 * Why deterministic?
 * We need to be able to decrypt the password later without storing the key
 * anywhere. By deriving the key from values already in the database, we can
 * always re-derive the same key on demand. As long as those four source
 * values do not change, decryption will always work.
 *
 * How it works:
 * The four values are concatenated into a single string, then passed through
 * SHA-256 to produce a fixed-length 32-byte buffer suitable for AES-256.
 *
 * @param projectId - The project's unique ID from the system config.
 * @param configId  - The system config record's own ID.
 * @param userId    - The user's unique ID.
 * @param createdAt - The ISO timestamp when the system config was created.
 * @returns A 32-byte Buffer to use as the AES-256-GCM encryption key.
 */
function deriveEncryptionKey({
  projectId, configId, userId, createdAt,
}: {
  projectId: string
  configId:  string
  userId:    string
  createdAt: string
}) {
  const rawKey = projectId + configId + userId + createdAt
  return crypto.createHash('sha256').update(rawKey).digest()
}

// ---------------------------------------------------------------------------
// Helper: encrypt data with AES-256-GCM
// ---------------------------------------------------------------------------

/**
 * encrypt
 *
 * Encrypts any JSON-serialisable value using AES-256-GCM authenticated
 * encryption and returns the result as three hex strings.
 *
 * Why AES-256-GCM?
 * GCM (Galois/Counter Mode) provides both confidentiality (the data is
 * encrypted) and integrity (a tampered ciphertext will be detected via the
 * auth tag). This is the recommended mode for encrypting sensitive config
 * values like passwords.
 *
 * The result shape { iv, content, tag } contains everything needed to
 * decrypt the value later — none of these parts are secret on their own,
 * only the key is secret.
 *
 * @param data - Any JSON-serialisable value to encrypt (e.g. a password string).
 * @param key  - The 32-byte AES-256 encryption key from deriveEncryptionKey().
 * @returns An object containing:
 *   - iv:      Hex-encoded random initialisation vector (changes every call).
 *   - content: Hex-encoded encrypted ciphertext.
 *   - tag:     Hex-encoded GCM authentication tag (used to verify integrity on decrypt).
 */
function encrypt(data: any, key: Buffer) {
  const iv        = crypto.randomBytes(IV_LENGTH)
  const cipher    = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ])
  return {
    iv:      iv.toString('hex'),
    content: encrypted.toString('hex'),
    tag:     cipher.getAuthTag().toString('hex'),
  }
}

// ---------------------------------------------------------------------------
// Helper: patch .env.local with multiple key-value pairs
// ---------------------------------------------------------------------------

/**
 * patchEnvFile
 *
 * Updates or appends multiple key-value pairs in the .env.local file on disk
 * in a single pass.
 *
 * Why this exists:
 * SMTP settings need to be available as environment variables at runtime.
 * Writing them to .env.local ensures they persist across server restarts
 * without requiring a manual file edit.
 *
 * How it works:
 * For each key-value pair in the updates object:
 * - If the key already exists in the file, its line is replaced in-place.
 * - If the key does not exist, it is appended on a new line at the end.
 * - If .env.local does not exist yet, it is created from scratch.
 *
 * This targeted approach avoids rewriting the entire file, which would risk
 * losing other environment variables already set there.
 *
 * @param updates - An object where each key is an env variable name and each
 *                  value is the string value to set for it.
 */
function patchEnvFile(updates: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  for (const [key, value] of Object.entries(updates)) {
    /**
     * Format the line as KEY="value" — quoting the value handles cases
     * where it contains spaces or special characters.
     */
    const line  = `${key}="${value}"`
    const regex = new RegExp(`^${key}=.*$`, 'm')

    if (regex.test(content)) {
      content = content.replace(regex, line)
    } else {
      content += `\n${line}`
    }
  }

  fs.writeFileSync(envPath, content, 'utf-8')
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Saves SMTP configuration to the database and patches .env.local.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @param req - The incoming Next.js server request. The JSON body must contain
 *              user_id plus any SMTP fields to update.
 * @returns A NextResponse containing { success: true } on success,
 *          or { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'updateSmtp' namespace.
   * Because this is a server-only route we use getTranslations() (async)
   * rather than the client-side useTranslations() hook.
   */
  //const t = await getTranslations('updateSmtp')

  try {
    // ── Parse request body ─────────────────────────────────────────────────

    /**
     * Extract all SMTP-related fields from the JSON request body.
     *
     * - user_id:         Required. Used to look up the system config record.
     * - verify_email:    Whether to send a verification email on signup.
     * - forgot_password: Whether to enable the forgot-password email flow.
     * - smtp_enabled:    Master toggle for the SMTP email system.
     * - host:            The SMTP server hostname (e.g. 'smtp.gmail.com').
     * - port:            The SMTP port (e.g. '587' for TLS, '465' for SSL).
     * - from_address:    The "From" email address for outgoing emails.
     * - username:        The SMTP authentication username.
     * - password:        The SMTP authentication password (will be encrypted).
     * - encryption:      The encryption method — 'TLS' or 'SSL'.
     */
    const {
      user_id,
      verify_email,
      forgot_password,
      smtp_enabled,
      host,
      port,
      from_address,
      username,
      password,
      encryption,
    } = await req.json()

    /**
     * user_id is mandatory — without it we cannot find the system config
     * record to update. Return 400 Bad Request immediately if missing.
     */
    if (!user_id)
      return NextResponse.json(
        { error: ('errors.userIdRequired') },
        { status: 400 }
      )

    // ── Build database config ──────────────────────────────────────────────

    /**
     * Read the configured database type from the environment.
     * This determines which adapter and config shape to build below.
     */
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    let dbConfig: DBConfig

    if (dbType === 'firebase') {
      /**
       * For Firebase we need two environment variables:
       *
       * - NEXT_DB_FIREBASE_SERVICE_ACCOUNT: Firebase Admin SDK service account
       *   JSON — used for all server-side database operations.
       * - NEXT_PUBLIC_FIREBASE_CONFIG: Firebase web client config JSON —
       *   used here to extract the storage bucket name.
       *
       * If the service account is missing we throw immediately — there is
       * no way to talk to Firebase without valid Admin credentials.
       */
      const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

      if (!serviceAccount)
        throw new Error(('errors.firebaseServiceAccountMissing'))

      const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
      const parsedConfig  = parseFirebaseWebConfig(configAccount)

      dbConfig = {
        type:               'firebase',
        firebaseConfigJson: JSON.stringify(parsedAccount),
        storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,
      }
    } else {
      /**
       * Only Firebase is currently supported by this route.
       * Throw a clear error so the developer knows to extend this route
       * rather than getting a cryptic runtime crash.
       */
      throw new Error(('errors.unsupportedDbType'))
    }

    // ── Look up existing system config ─────────────────────────────────────

    /**
     * Initialise the database adapter with the config we built above, then
     * look up the system config record that belongs to this user_id.
     */
    const adapter  = getAdapter(dbType, dbConfig)
    const existing = await adapter.findSystemConfigByUserId!(adapter.config, user_id)

    /**
     * If no system config record was found for this user_id, return 404.
     * This can happen if the installer never ran to completion for this user.
     */
    if (!existing?.id)
      return NextResponse.json(
        { error: ('errors.systemConfigNotFound') },
        { status: 404 }
      )

    // ── Derive encryption key ──────────────────────────────────────────────

    /**
     * Derive the AES-256-GCM encryption key from the system config record's
     * own identifiers. This key is used to encrypt the SMTP password before
     * storing it in the database — we never store passwords in plain text.
     *
     * We fall back to user_id / existing.id if the preferred fields are
     * absent, ensuring the key can always be derived even for older records
     * that may be missing those fields.
     *
     * See deriveEncryptionKey() above for full details on the key derivation.
     */
    const encryptionKey = deriveEncryptionKey({
      projectId: existing.project_id ?? user_id,
      configId:  existing.config_id  ?? existing.id,
      userId:    user_id,
      createdAt: existing.created_at ?? new Date().toISOString(),
    })

    // ── Build SMTP update payload ──────────────────────────────────────────

    /**
     * Construct the object of SMTP fields to update on the system config record.
     * We use dot-notation keys (e.g. 'smtp.host') because these fields are
     * nested inside an `smtp` sub-object in Firestore — this updates only
     * those nested fields without overwriting the rest of the document.
     *
     * Each field falls back to a sensible default if not provided so we
     * never write undefined into the database.
     */
    const smtpUpdate: Record<string, any> = {
      'smtp.enabled':         smtp_enabled    ?? false,
      'smtp.verify_email':    verify_email    ?? false,
      'smtp.forgot_password': forgot_password ?? false,
      'smtp.host':            host            ?? '',
      'smtp.port':            port            ?? '587',
      'smtp.from_address':    from_address    ?? '',
      'smtp.username':        username        ?? '',
      'smtp.encryption':      encryption      ?? 'TLS',
      updated_at:             new Date().toISOString(),
    }

    /**
     * Only encrypt and include the password if one was provided.
     * If the user saved settings without changing their password, we leave
     * the existing encrypted password in the database untouched.
     */
    if (password) {
      smtpUpdate['smtp.password_encrypted'] = encrypt(password, encryptionKey)
    }

    // ── Write update to database ───────────────────────────────────────────

    /**
     * Persist the SMTP update payload to the system config record.
     * The `!` after adapter.update asserts the method exists on the adapter.
     */
    await adapter.update!(
      adapter.config,
      'nxf_system_config',
      existing.id,
      smtpUpdate
    )

    // ── Patch .env.local ───────────────────────────────────────────────────

    /**
     * Mirror all non-sensitive SMTP values into .env.local so they are
     * available as environment variables at runtime and on the next restart.
     *
     * IMPORTANT: Only NEXT_SMTP_PASSWORD (no NEXT_PUBLIC_ prefix) is used
     * for the raw password. Variables prefixed with NEXT_PUBLIC_ are bundled
     * into the browser JavaScript — we must never expose SMTP credentials
     * there. The server-only NEXT_SMTP_PASSWORD is only accessible in
     * server-side code.
     */
    const envUpdates: Record<string, string> = {
      NEXT_PUBLIC_SMTP_HOST:         host         ?? '',
      NEXT_PUBLIC_SMTP_PORT:         port         ?? '587',
      NEXT_PUBLIC_SMTP_FROM:         from_address ?? '',
      NEXT_PUBLIC_SMTP_USER:         username     ?? '',
      NEXT_PUBLIC_SMTP_ENCRYPTION:   encryption   ?? 'TLS',
      NEXT_PUBLIC_SMTP_VERIFY_EMAIL: String(verify_email    ?? false),
      NEXT_PUBLIC_SMTP_FORGOT_PW:    String(forgot_password ?? false),
      NEXT_PUBLIC_SMTP_ENABLED:      String(smtp_enabled    ?? false),
    }

    /**
     * Write the raw password to a server-only env variable so it is
     * available for sending emails but never exposed to the browser bundle.
     */
    if (password) {
      envUpdates['NEXT_SMTP_PASSWORD'] = password
    }

    patchEnvFile(envUpdates)

    return NextResponse.json({ success: true })

  } catch {
    /**
     * Catch-all for any unexpected errors (Firebase credentials invalid,
     * database write failed, JSON parse error, filesystem write failed,
     * encryption error, etc.).
     *
     * We return a generic 500 without echoing back the raw error object or
     * its message — leaking SMTP credentials, encryption details, Firebase
     * config, or internal stack traces is a serious security risk.
     */
    return NextResponse.json(
      { error: ('errors.internalError') },
      { status: 500 }
    )
  }
}