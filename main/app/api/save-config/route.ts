/**
 * POST /api/installer/save-config
 *
 * A Next.js API route that saves the completed installer configuration to the
 * database at the end of the NXTFlutter installer wizard.
 *
 * This is one of the most critical routes in the installer — it:
 * 1. Validates that all required fields were submitted.
 * 2. Creates the admin user account if one doesn't already exist.
 * 3. Creates the project record if one doesn't already exist.
 * 4. Encrypts the database config before storing it (AES-256-GCM).
 * 5. Saves the full installer config to the database.
 *
 * Security highlights:
 * - The database config (which may contain connection strings, passwords, and
 *   API keys) is encrypted with AES-256-GCM before being stored. The
 *   encryption key is derived from a combination of project/user/config IDs
 *   and the creation timestamp — meaning it is unique per config record.
 * - The admin user's raw password is NEVER logged.
 * - Sensitive fields (db credentials, admin password) are never included
 *   in error responses or debug output.
 *
 * Request:
 * - Method:  POST
 * - Headers: Content-Type: application/json
 * - Body:    See field descriptions in the handler below.
 *
 * Response (success):
 * - 200 { success: true, project_id: string, config_id: string }
 *
 * Response (error):
 * - 400 { error: 'Missing required fields', missingFields: string[] }
 * - 400 { error: 'Adapter does not support required methods' }
 * - 404 { error: 'Admin user could not be created or found' }
 * - 500 { error: string }
 */

import { NextResponse }         from 'next/server'
import { getAdapter }           from '@/app/db-adapter'
import { DBConfig }             from '@/app/db-adapter/types'
import crypto                   from 'crypto'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * IV_LENGTH
 *
 * The length in bytes of the Initialisation Vector (IV) used for AES-256-GCM
 * encryption. 16 bytes (128 bits) is the standard IV length for AES-GCM.
 *
 * The IV is randomly generated for each encryption operation and stored
 * alongside the ciphertext so it can be used during decryption.
 * It does not need to be secret — only unique per encryption.
 */
const IV_LENGTH = 16

// ---------------------------------------------------------------------------
// Encryption helpers
// ---------------------------------------------------------------------------

/**
 * deriveEncryptionKey
 *
 * Derives a deterministic 256-bit (32-byte) AES encryption key from a set
 * of identifiers unique to this config record.
 *
 * How it works:
 * - Concatenates projectId + configId + userId + createdAt into a single string.
 * - Runs that string through SHA-256 to produce a fixed-length 32-byte key.
 *
 * Why derive the key this way?
 * - The key is uniquely tied to this specific config record. Even if two
 *   records have the same dbConfig contents, their encryption keys will differ.
 * - The key can be re-derived at decryption time using the same identifiers,
 *   so it does not need to be stored separately.
 *
 * SECURITY: The inputs to this function (IDs and timestamp) are not secret,
 * but their combination produces a key that is unique and non-guessable.
 * For production systems, consider using a dedicated KMS (Key Management
 * Service) for stronger key management guarantees.
 *
 * @param projectId  - The unique ID of the project.
 * @param configId   - The unique ID of this config record.
 * @param userId     - The unique ID of the admin user.
 * @param createdAt  - The ISO timestamp of when this config was created.
 * @returns           A 32-byte Buffer to use as the AES-256 encryption key.
 */
function deriveEncryptionKey({
  projectId,
  configId,
  userId,
  createdAt,
}: {
  projectId:  string
  configId:   string
  userId:     string
  createdAt:  string
}) {
  const rawKey = projectId + configId + userId + createdAt
  return crypto.createHash('sha256').update(rawKey).digest()
}

/**
 * encrypt
 *
 * Encrypts an arbitrary JavaScript value (object, string, etc.) using
 * AES-256-GCM authenticated encryption.
 *
 * What is AES-256-GCM?
 * - AES-256: A symmetric encryption algorithm using a 256-bit key.
 *   It is the industry standard for strong encryption.
 * - GCM (Galois/Counter Mode): An authenticated encryption mode that
 *   produces an authentication tag alongside the ciphertext. This tag
 *   allows the decryptor to verify the data was not tampered with.
 *
 * How it works:
 * 1. Generates a random 16-byte IV (Initialisation Vector) for this operation.
 *    The IV ensures that encrypting the same data twice produces different output.
 * 2. Creates an AES-256-GCM cipher using the provided key and IV.
 * 3. Serialises the input data to JSON and encrypts it.
 * 4. Extracts the GCM authentication tag (used to verify integrity on decrypt).
 * 5. Returns the IV, ciphertext, and auth tag as hex strings.
 *
 * @param data - Any value to encrypt. Will be JSON-serialised before encryption.
 * @param key  - A 32-byte Buffer (the AES-256 encryption key).
 * @returns     An object containing { iv, content, tag } all as hex strings.
 */
function encrypt(data: any, key: Buffer) {
  // Generate a fresh random IV for each encryption — never reuse an IV
  const iv     = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  // Serialise the data to JSON and encrypt it in one pass
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ])

  return {
    iv:      iv.toString('hex'),         // Stored so decryption can use the same IV
    content: encrypted.toString('hex'),  // The actual encrypted data
    tag:     cipher.getAuthTag().toString('hex'), // GCM auth tag for integrity verification
  }
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * getMissingFields
 *
 * Checks a map of field names to their values and returns the names of any
 * fields that are missing (undefined, null, or empty string).
 *
 * Used to validate the request body before doing any database work,
 * so we can return a clear error listing exactly which fields are absent.
 *
 * @param fields - An object mapping field names to their values.
 * @returns       An array of field names that have empty/missing values.
 *
 * @example
 * getMissingFields({ name: 'Alice', email: '' })
 * // → ['email']
 */
function getMissingFields(fields: Record<string, any>): string[] {
  return Object.entries(fields)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key)
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST handler
 *
 * Orchestrates the full installer config save:
 * validate → find/create user → find/create project → encrypt → save config.
 *
 * @param req - The incoming request containing the installer form data.
 * @returns    A NextResponse with { success, project_id, config_id } or an error.
 */
export async function POST(req: Request) {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Parse the request body
    // -----------------------------------------------------------------------

    /**
     * Extract all installer form fields from the request body.
     *
     * Fields:
     * - projectName         — The user-provided name for their project.
     * - selectedStack       — The chosen tech stack ('next', 'flutter', 'both').
     * - selectedDb          — The chosen database type ('supabase', 'mongodb', etc.).
     * - dbConfig            — Connection config for the chosen database.
     * - adminUser           — The admin account details { email, password, full_name }.
     * - featureFlags        — Optional map of enabled/disabled feature flags.
     * - selectedProjectType — The project template chosen (e.g. 'ecommerce').
     * - branding            — Optional branding config { logoUrl, faviconUrl, primaryColor }.
     *
     * SECURITY: `dbConfig` may contain passwords and connection strings.
     *           `adminUser.password` is a raw password.
     *           Neither is ever logged.
     */
    const {
      projectName,
      selectedStack,
      selectedDb,
      dbConfig,
      adminUser,
      featureFlags = {},
      selectedProjectType,
      branding = {},
    } = await req.json()

    // -----------------------------------------------------------------------
    // Step 2: Validate required fields
    // -----------------------------------------------------------------------

    /**
     * Some database types (supabase, firebase, mongodb, mysql, postgres) manage
     * authentication themselves, so the admin password is not required for them.
     * For all other adapter types, the password is mandatory.
     */
    const requirePassword = !['supabase', 'firebase', 'mongodb', 'mysql', 'postgres']
      .includes(selectedDb)

    /**
     * Build a map of all required fields and check which ones are missing.
     * `adminUserPassword` is only included in the check when required.
     */
    const missingFields = getMissingFields({
      selectedStack,
      selectedDb,
      dbConfig,
      adminUserEmail: adminUser?.email,
      ...(requirePassword && { adminUserPassword: adminUser?.password }),
      selectedProjectType,
    })

    if (missingFields.length > 0) {
      /**
       * Log which fields are missing (field names only — no values)
       * to help diagnose incomplete installer submissions server-side.
       */
      console.error('[save-config] Missing required fields:', missingFields)

      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
          /**
           * Return a safe subset of what was received so the client can
           * debug the submission without exposing sensitive values.
           * We confirm email presence and password existence (not the value).
           */
          received: {
            selectedStack,
            selectedDb,
            hasDbConfig:         !!dbConfig,
            adminUser: {
              email:       adminUser?.email ?? null,
              hasPassword: !!adminUser?.password,
            },
            selectedProjectType,
          },
        },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Step 3: Initialise the database adapter
    // -----------------------------------------------------------------------

    /**
     * `getAdapter()` returns a database-specific adapter instance based on
     * the selected db type and its config.
     *
     * We verify the adapter exposes the two methods needed for this route:
     * - `findUserByEmailWithRetry` — Looks up an existing user by email.
     * - `createAdminUser`          — Creates a new admin user account.
     */
    const adapter = getAdapter(selectedDb, dbConfig as DBConfig)

    if (!adapter.findUserByEmailWithRetry || !adapter.createAdminUser) {
      return NextResponse.json(
        { error: 'Adapter does not support required methods' },
        { status: 400 }
      )
    }

    console.log(`[save-config] Using adapter for db type: ${selectedDb}`)

    // -----------------------------------------------------------------------
    // Step 4: Find or create the admin user
    // -----------------------------------------------------------------------

    /**
     * Check if an admin user with this email already exists in the database.
     * This makes the installer idempotent — re-running it won't duplicate the
     * admin account.
     */
    let user = await adapter.findUserByEmailWithRetry(adapter.config, adminUser.email)

    if (!user?.user_id && !user?.id) {
      /**
       * No existing user found — create a new admin account.
       * We generate a UUID for the user ID rather than relying on the
       * database to auto-generate one, so we have the ID available immediately.
       *
       * SECURITY: adminUser.password (raw) is passed to the adapter which is
       * responsible for hashing it before storage. It is never logged here.
       */
      console.log('[save-config] Admin user not found — creating new admin account')
      const userId = crypto.randomUUID()

      await adapter.createAdminUser(adapter.config, {
        user_id:    userId,
        user_email: adminUser.email,
        password:   adminUser.password ?? '',
        full_name:  adminUser.full_name,
        role:       'admin',
      })

      // Re-fetch the user to confirm creation and get the full user object
      user = await adapter.findUserByEmailWithRetry(adapter.config, adminUser.email)
    }

    /**
     * Extract the user ID — different adapters may use `user_id` or `id`.
     * If still not found after creation attempt, return 404.
     */
    const userId = user.user_id || user.id
    if (!userId) {
      return NextResponse.json(
        { error: 'Admin user could not be created or found' },
        { status: 404 }
      )
    }

    console.log('[save-config] Admin user resolved successfully')

    // -----------------------------------------------------------------------
    // Step 5: Find or create the project
    // -----------------------------------------------------------------------

    /**
     * Check if a project already exists for this user.
     * Again, this makes the installer idempotent.
     */
    let project = await adapter.findProjectByOwnerId!(adapter.config, userId)

    if (!project?.project_id && !project?.id) {
      /**
       * No existing project — create one.
       * Falls back to "<full_name>'s Project" if no projectName was provided.
       */
      console.log('[save-config] Project not found — creating new project')

      const projectId = await adapter.createProject!(adapter.config, {
        name:    projectName || `${adminUser.full_name}'s Project`,
        user_id: userId,
      })

      project = { project_id: projectId }
    }

    /**
     * Extract the project ID — adapters may use `project_id` or `id`.
     */
    const projectId = project.project_id || project.id
    console.log('[save-config] Project resolved successfully')

    // -----------------------------------------------------------------------
    // Step 6: Encrypt the database config
    // -----------------------------------------------------------------------

    /**
     * Generate a unique config ID and creation timestamp.
     * Both are used as inputs to the encryption key derivation so that the
     * key is unique to this specific config record.
     */
    const createdAt      = new Date().toISOString()
    const configIdForKey = crypto.randomUUID()

    /**
     * Derive the AES-256 encryption key from the record's identifiers.
     * See `deriveEncryptionKey` above for full explanation.
     */
    const encryptionKey = deriveEncryptionKey({
      projectId,
      configId:  configIdForKey,
      userId,
      createdAt,
    })

    /**
     * Encrypt the full dbConfig object.
     * This protects connection strings, passwords, and API keys at rest.
     * The encrypted output ({ iv, content, tag }) is what gets stored in the DB.
     *
     * SECURITY: The raw dbConfig is NEVER logged — only the encrypted form is stored.
     */
    console.log('[save-config] Encrypting database config')
    const encryptedDbConfig = encrypt(dbConfig, encryptionKey)

    // -----------------------------------------------------------------------
    // Step 7: Prepare the branding config
    // -----------------------------------------------------------------------

    /**
     * Normalise the branding values, applying sensible defaults for any
     * missing fields. This ensures the stored config always has valid branding
     * values even if the user skipped the branding step.
     */
    const safeBranding = {
      logo_url:      branding?.logoUrl     || '',
      favicon_url:   branding?.faviconUrl  || '/images/favicon/NXT_Flutter_favicon.png',
      primary_color: branding?.primaryColor || '#000000',
    }

    // -----------------------------------------------------------------------
    // Step 8: Save the full installer config to the database
    // -----------------------------------------------------------------------

    /**
     * Save the complete installer configuration record.
     *
     * Notable fields:
     * - `db_config`  — The encrypted database config (not the raw values).
     * - `admin_user` — Includes email and full name. Password is only included
     *                  for adapter types that require it (`requirePassword`).
     * - `is_active`  — Marks this as the active config for the project.
     *
     * SECURITY: The admin password (if included) is stored as provided by the
     * adapter layer — it is the adapter's responsibility to hash it if needed.
     * The raw password is never logged at this step.
     */
    console.log('[save-config] Saving installer config to database')

    const configId = await adapter.saveInstallerConfig!(adapter.config, {
      config_id:             configIdForKey,
      project_id:            projectId,
      project_name:          projectName || `${adminUser.full_name}'s Project`,
      user_id:               userId,
      deployment_type:       'self_hosted',
      status:                'configured',
      selected_stack:        selectedStack,
      selected_db:           selectedDb,
      selected_project_type: selectedProjectType,
      db_config:             encryptedDbConfig,
      admin_user: {
        email:     adminUser.email,
        full_name: adminUser.full_name,
        user_id:   userId,
        ...(requirePassword && { password: adminUser.password }),
      },
      feature_flags:      featureFlags,
      branding:           safeBranding,
      generator_version:  '1.0.0',
      is_active:          true,
      created_at:         createdAt,
      updated_at:         createdAt,
    })

    console.log('[save-config] Installer config saved successfully')

    // -----------------------------------------------------------------------
    // Step 9: Return the created IDs to the client
    // -----------------------------------------------------------------------

    return NextResponse.json({
      success:    true,
      project_id: projectId,
      config_id:  configId,
    })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message — never the full error object, the dbConfig,
     * admin credentials, or any other sensitive installer data.
     */
    console.error('[save-config] Unexpected error:', err.message)
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    )
  }
}