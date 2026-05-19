import 'server-only'

/**
 * API Route: POST /api/settings/update-branding
 *
 * A server-side endpoint that updates the branding configuration (logo and
 * favicon URLs) for a given user's system config record.
 *
 * What this route does:
 * 1. Reads user_id, logo_url, and favicon_url from the JSON request body.
 * 2. Validates that user_id is present — it is required to look up the
 *    correct system config record.
 * 3. Builds the correct database config object based on the configured
 *    DB type (currently only Firebase is supported).
 * 4. Looks up the existing system config record for the given user_id.
 *    Returns 404 if no record is found.
 * 5. Updates the branding fields (logo_url, favicon_url) on the system
 *    config record in the database.
 * 6. Patches the local nxt_flutter.config.json file on disk so the running
 *    server immediately reflects the new branding without a restart.
 *
 * Authentication: None enforced at this layer (handled upstream/middleware)
 * Method:         POST
 * Body:           { user_id: string, logo_url?: string, favicon_url?: string }
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures Firebase credentials and filesystem access are never exposed
 * to the browser.
 */

import { NextRequest, NextResponse }                                          from 'next/server'
import { getTranslations }                                                    from 'next-intl/server'
import { getAdapter }                                                         from '@/app/db-adapter'
import { DBConfig, DBType }                                                   from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig }               from '@/app/lib/firebaseConfig'
import fs                                                                     from 'fs'
import path                                                                   from 'path'

// ---------------------------------------------------------------------------
// Helper: patch local config file
// ---------------------------------------------------------------------------

/**
 * patchConfigFile
 *
 * Updates the logoUrl and faviconUrl fields inside the local
 * nxt_flutter.config.json file on disk.
 *
 * Why this exists:
 * The database holds the canonical branding values, but the running Next.js
 * server also reads from nxt_flutter.config.json for certain server-side
 * operations (e.g. injecting the favicon into the <head> on every request).
 * Without patching this file, the server would keep serving the old branding
 * until it was restarted or the file was manually updated.
 *
 * If the file does not exist (e.g. during testing or in a non-standard
 * deployment), this function returns silently without throwing — the database
 * update has already succeeded at this point so we do not want to roll it back
 * just because the local config file is missing.
 *
 * @param logoUrl    - The new logo URL to write into the config file.
 * @param faviconUrl - The new favicon URL to write into the config file.
 */
function patchConfigFile(logoUrl: string, faviconUrl: string) {
  const filePath = path.resolve(process.cwd(), 'nxt_flutter.config.json')

  /**
   * Guard: if the config file doesn't exist on disk, skip silently.
   * This can happen in CI environments or fresh installs before the
   * installer has run.
   */
  if (!fs.existsSync(filePath)) return

  /**
   * Read, parse, update, and re-write the config file.
   * JSON.stringify with indentation (2 spaces) preserves human-readable
   * formatting so the file remains easy to inspect manually.
   */
  const config      = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  config.logoUrl    = logoUrl
  config.faviconUrl = faviconUrl
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Updates branding URLs in the database and patches the local config file.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @param req - The incoming Next.js server request. The JSON body must
 *              contain user_id, and optionally logo_url and favicon_url.
 * @returns A NextResponse containing { success: true } on success,
 *          or { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'updateBranding' namespace.
   * Because this is a server-only route we use getTranslations() (async)
   * rather than the client-side useTranslations() hook.
   */
 // const t = await getTranslations('updateBranding')

  try {
    // ── Parse request body ───────────────────────────────────────────────────

    /**
     * Extract the three fields from the JSON request body:
     *
     * - user_id:     Required. Used to look up the system config record that
     *                belongs to this user.
     * - logo_url:    Optional. The new logo image URL. Defaults to '' if not
     *                provided, which effectively clears the logo.
     * - favicon_url: Optional. The new favicon image URL. Defaults to '' if
     *                not provided, which effectively clears the favicon.
     */
    const { user_id, logo_url, favicon_url } = await req.json()

    /**
     * user_id is mandatory — without it we cannot look up the correct system
     * config record to update. Return 400 Bad Request immediately if missing.
     */
    if (!user_id)
      return NextResponse.json(
        { error: ('errors.userIdRequired') },
        { status: 400 }
      )

    // ── Build database config ────────────────────────────────────────────────

    /**
     * Read the configured database type from the environment.
     * This determines which adapter and config shape to use below.
     */
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType
    let dbConfig: DBConfig

    if (dbType === 'firebase') {
      /**
       * For Firebase, we need two environment variables:
       *
       * - NEXT_DB_FIREBASE_SERVICE_ACCOUNT: The Firebase Admin SDK service
       *   account JSON (used for server-side database and auth operations).
       * - NEXT_PUBLIC_FIREBASE_CONFIG: The Firebase web client config JSON
       *   (used here to extract the storage bucket name).
       *
       * If the service account is missing, we throw immediately — there is
       * no way to proceed without valid Firebase Admin credentials.
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
        storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL
      }
    } else {
      /**
       * Only Firebase is currently supported by this route.
       * If a different DB type is configured, throw a clear error so the
       * developer knows to extend this route rather than getting a cryptic
       * "cannot read property of undefined" crash.
       */
      throw new Error(('errors.unsupportedDbType'))
    }

    // ── Look up existing system config ───────────────────────────────────────

    /**
     * Initialise the database adapter with the config we built above, then
     * look up the system config record that belongs to this user_id.
     *
     * The `!` after adapter.findSystemConfigByUserId asserts the method exists.
     * If it does not, this will throw and be caught by the outer try/catch.
     */
    const adapter  = getAdapter(dbType, dbConfig)
    const existing = await adapter.findSystemConfigByUserId!(adapter.config, user_id)

    /**
     * If no system config record was found for this user_id, we cannot update
     * anything — return 404 Not Found.
     *
     * This can happen if the user completed auth setup but the installer never
     * ran to completion and created the system config record.
     */
    if (!existing?.id)
      return NextResponse.json(
        { error: ('errors.systemConfigNotFound') },
        { status: 404 }
      )

    // ── Update branding in database ──────────────────────────────────────────

    /**
     * Write the new branding URLs to the system config record in the database.
     *
     * We use dot-notation keys ('branding.logo_url', 'branding.favicon_url')
     * because the branding fields are nested inside a `branding` sub-object
     * in Firestore — this updates only those nested fields without overwriting
     * the rest of the branding object.
     *
     * logo_url and favicon_url fall back to '' if not provided, which
     * effectively clears the branding asset.
     */
    await adapter.update!(adapter.config, 'nxf_system_config', existing.id, {
      'branding.logo_url':    logo_url    ?? '',
      'branding.favicon_url': favicon_url ?? '',
      updated_at:             new Date().toISOString(),
    })

    // ── Patch local config file ──────────────────────────────────────────────

    /**
     * Mirror the new branding values into the local nxt_flutter.config.json
     * file so the running server immediately reflects the change.
     * See the patchConfigFile function above for full details.
     */
    patchConfigFile(logo_url ?? '', favicon_url ?? '')

    return NextResponse.json({ success: true })

  } catch {
    /**
     * Catch-all for unexpected errors (Firebase credentials invalid, database
     * write failed, JSON parse error, filesystem write failed, etc.).
     *
     * We return a generic 500 without echoing back the raw error object or its
     * message — leaking Firebase config details, internal field paths, or
     * filesystem paths is a security risk.
     */
    return NextResponse.json(
      { error: ('errors.internalError') },
      { status: 500 }
    )
  }
}