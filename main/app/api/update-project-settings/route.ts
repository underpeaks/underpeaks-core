import 'server-only'

/**
 * API Route: POST /api/settings/update-project
 *
 * A server-side endpoint that updates the project-level settings for a given
 * user's system config record, and mirrors those changes into the local
 * environment and config files so the running server reflects them immediately.
 *
 * What this route does:
 * 1. Reads user_id, project_name, project_url, and optionally nxf_api_key
 *    from the JSON request body.
 * 2. Validates that user_id and project_name are both present.
 * 3. Builds the correct database config based on the configured DB type
 *    (currently only Firebase is supported).
 * 4. Looks up the existing system config record for the given user_id.
 *    Returns 404 if no record is found.
 * 5. Updates the project settings fields on the system config record
 *    in the database. nxf_api_key is only included in the update if it
 *    was explicitly provided in the request body.
 * 6. Patches the local .env.local file with the new NEXT_PUBLIC_APP_DOMAIN
 *    and NXF_API_KEY values so they take effect on the next server restart.
 * 7. Patches the local nxt_flutter.config.json file with the new project
 *    name and URL so the running server reflects them immediately.
 *
 * Authentication: None enforced at this layer (handled upstream/middleware)
 * Method:         POST
 * Body:           {
 *                   user_id:      string  (required),
 *                   project_name: string  (required),
 *                   project_url:  string  (optional),
 *                   nxf_api_key:  string  (optional)
 *                 }
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures filesystem access, env file writes, and Firebase credentials
 * are never exposed to the browser.
 */

import { NextRequest, NextResponse }                             from 'next/server'
import { getTranslations }                                       from 'next-intl/server'
import { getAdapter }                                            from '@/app/db-adapter'
import { DBConfig, DBType }                                      from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig }  from '@/app/lib/firebaseConfig'
import fs                                                        from 'fs'
import path                                                      from 'path'

// ---------------------------------------------------------------------------
// Helper: patch a single key in .env.local
// ---------------------------------------------------------------------------

/**
 * patchEnvFile
 *
 * Updates or appends a single key-value pair in the .env.local file on disk.
 *
 * Why this exists:
 * When the user saves new project settings (e.g. a new domain or API key),
 * those values need to be available as environment variables the next time
 * the server starts. Writing them into .env.local is how Next.js persists
 * environment variables across restarts in a self-hosted setup.
 *
 * How it works:
 * - If the key already exists in the file, its line is replaced in-place.
 * - If the key does not exist, it is appended on a new line at the end.
 * - If the .env.local file does not exist yet, it is created from scratch.
 *
 * This targeted approach avoids rewriting the entire file, which would risk
 * losing other environment variables that are already set there.
 *
 * @param key   - The environment variable name (e.g. 'NEXT_PUBLIC_APP_DOMAIN').
 * @param value - The value to set for that variable (e.g. 'https://myapp.com').
 */
function patchEnvFile(key: string, value: string) {
  const envPath = path.resolve(process.cwd(), '.env.local')

  /**
   * Read the existing file content if it exists, otherwise start with an
   * empty string so we can safely append to it below.
   */
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  /**
   * Build the new line in the standard .env format: KEY="value"
   * Quoting the value handles cases where it contains spaces or special chars.
   */
  const line  = `${key}="${value}"`

  /**
   * Build a regex that matches the existing line for this key, if any.
   * The `^` and `$` anchors with the `m` (multiline) flag match the key
   * at the start of any line in the file.
   */
  const regex = new RegExp(`^${key}=.*$`, 'm')

  if (regex.test(content)) {
    /**
     * Key already exists — replace the existing line with the updated value.
     */
    content = content.replace(regex, line)
  } else {
    /**
     * Key does not exist yet — append it on a new line at the end of the file.
     */
    content += `\n${line}`
  }

  fs.writeFileSync(envPath, content, 'utf-8')
}

// ---------------------------------------------------------------------------
// Helper: patch projectName and projectUrl in nxt_flutter.config.json
// ---------------------------------------------------------------------------

/**
 * patchConfigFile
 *
 * Updates the projectName and projectUrl fields inside the local
 * nxt_flutter.config.json file on disk.
 *
 * Why this exists:
 * The database holds the canonical project settings, but the running Next.js
 * server also reads from nxt_flutter.config.json for certain server-side
 * operations (e.g. displaying the project name in the UI, constructing URLs).
 * Without patching this file, those values would remain stale until the
 * server was restarted and re-read from the database.
 *
 * If the config file does not exist (e.g. in CI or non-standard deployments),
 * this function returns silently — the database update has already succeeded
 * at this point so we do not want to throw an error over a missing local file.
 *
 * @param projectName - The new project name to write into the config file.
 * @param projectUrl  - The new project URL to write into the config file.
 */
function patchConfigFile(projectName: string, projectUrl: string) {
  const filePath = path.resolve(process.cwd(), 'nxt_flutter.config.json')

  /**
   * Guard: if the config file doesn't exist on disk, skip silently.
   */
  if (!fs.existsSync(filePath)) return

  /**
   * Read, parse, update the relevant fields, and re-write the file.
   * JSON.stringify with 2-space indentation preserves human-readable
   * formatting so the file remains easy to inspect manually.
   */
  const config       = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.projectName = projectName
  config.projectUrl  = projectUrl
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Updates project settings in the database and patches the local env and
 * config files to reflect the changes immediately.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @param req - The incoming Next.js server request. The JSON body must contain
 *              user_id and project_name, with project_url and nxf_api_key
 *              being optional.
 * @returns A NextResponse containing { success: true } on success,
 *          or { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'updateProject' namespace.
   * Because this is a server-only route we use getTranslations() (async)
   * rather than the client-side useTranslations() hook.
   */
  //const t = await getTranslations('updateProject')

  try {
    // ── Parse and validate request body ───────────────────────────────────

    /**
     * Extract the four fields from the JSON request body:
     *
     * - user_id:      Required. Used to look up the system config record.
     * - project_name: Required. The new display name for the project.
     * - project_url:  Optional. The full URL the project is hosted at.
     * - nxf_api_key:  Optional. If provided, updates the stored API key.
     *                 If omitted (undefined), the existing key is left unchanged.
     */
    const { user_id, project_name, project_url, nxf_api_key } = await req.json()

    /**
     * Both user_id and project_name are required.
     * Without user_id we cannot find the config record.
     * Without project_name we have nothing meaningful to save.
     */
    if (!user_id || !project_name)
      return NextResponse.json(
        { error: ('errors.requiredFieldsMissing') },
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
       * - NEXT_DB_FIREBASE_SERVICE_ACCOUNT: The Firebase Admin SDK service
       *   account JSON (used for server-side database operations).
       * - NEXT_PUBLIC_FIREBASE_CONFIG: The Firebase web client config JSON
       *   (used here to extract the storage bucket name).
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
        storageBucket:       process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,
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

    // ── Build update payload ───────────────────────────────────────────────

    /**
     * Construct the object of fields to update on the system config record.
     *
     * We always include project_name, project_url, and updated_at.
     * We only include nxf_api_key if it was explicitly sent in the request —
     * checking for `undefined` (rather than falsy) means an empty string
     * can still be used to clear the key if the caller intends that.
     */
    const updatePayload: Record<string, any> = {
      project_name,
      project_url: project_url ?? '',
      updated_at:  new Date().toISOString(),
    }

    if (nxf_api_key !== undefined) {
      updatePayload.nxf_api_key = nxf_api_key
    }

    // ── Update database record ─────────────────────────────────────────────

    /**
     * Write the update payload to the system config record in the database.
     * The `!` after adapter.update asserts the method exists on the adapter.
     */
    await adapter.update!(adapter.config, 'nxf_system_config', existing.id, updatePayload)

    // ── Patch local environment file ───────────────────────────────────────

    /**
     * Mirror the new values into .env.local so they are available as
     * environment variables on the next server restart.
     * We only patch each key if the corresponding value was provided.
     */
    if (project_url) patchEnvFile('NEXT_PUBLIC_APP_DOMAIN', project_url)
    if (nxf_api_key) patchEnvFile('NXF_API_KEY', nxf_api_key)

    // ── Patch local config file ────────────────────────────────────────────

    /**
     * Mirror the new project name and URL into nxt_flutter.config.json so
     * the running server reflects the changes immediately without a restart.
     * See the patchConfigFile function above for full details.
     */
    patchConfigFile(project_name, project_url ?? '')

    return NextResponse.json({ success: true })

  } catch {
    /**
     * Catch-all for any unexpected errors (Firebase credentials invalid,
     * database write failed, JSON parse error, filesystem write failed, etc.).
     *
     * We return a generic 500 without echoing back the raw error object or its
     * message — leaking Firebase config details, internal field names, env file
     * paths, or stack traces is a security risk.
     */
    return NextResponse.json(
      { error: ('errors.internalError') },
      { status: 500 }
    )
  }
}