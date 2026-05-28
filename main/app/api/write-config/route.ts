/**
 * API Route: POST /api/installer/write-config
 *
 * A server-side endpoint that takes the completed installer state and writes
 * it out to the project's local configuration files (e.g. .env.local,
 * nxt_flutter.config.json, etc.) so the application is fully configured
 * after the installer wizard finishes.
 *
 * What this route does:
 * 1. Reads the full InstallerState object from the JSON request body.
 *    InstallerState is the accumulated data collected across all installer
 *    wizard steps (project name, domain, database config, admin user, etc.).
 * 2. Passes that state to writeConfigFromStore, which handles the actual
 *    work of writing config files to disk.
 * 3. Returns the result of the write operation — typically { success: true }
 *    or an object with details about what was written.
 *
 * Why this exists as a separate API route:
 * Writing to the filesystem (e.g. .env.local) can only be done on the server.
 * The installer wizard runs in the browser as a client-side React app, so it
 * must call this server-side route to perform the final config file writes.
 *
 * Authentication: None — this route is intentionally public because it is
 *                 called during the installer before any auth system exists.
 * Method:         POST
 * Body:           InstallerState — the full accumulated installer wizard state
 * Success:        Result object from writeConfigFromStore (typically { success: true })
 * Errors:         { success: false, message: string } with status 500
 */

import { NextRequest, NextResponse } from 'next/server'
import { InstallerState }            from '@/app/store/useInstallerStore'
import { writeConfigFromStore }      from '@/app/db-adapter/utils/writeConfigFiles'

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Receives the completed installer state and writes it to local config files.
 * See the file-level JSDoc above for the full description.
 *
 * @param req - The incoming Next.js server request. The JSON body must be a
 *              valid InstallerState object containing all values collected
 *              during the installer wizard.
 * @returns A NextResponse with the result of the config write on success,
 *          or { success: false, message: string } on failure.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Parse request body ─────────────────────────────────────────────────

    /**
     * Parse the incoming JSON body as an InstallerState object.
     *
     * InstallerState is the complete shape of the installer wizard's global
     * store — it contains everything the user entered across all wizard steps,
     * such as:
     *   - Project name, domain, subdomain
     *   - Database type and connection credentials
     *   - Admin user details
     *   - Any other configuration collected during setup
     *
     * This data is sent by the final step of the installer wizard after the
     * user has completed all steps and clicked "Finish" or equivalent.
     */
    const body: InstallerState = await req.json()

    // ── Write config files ─────────────────────────────────────────────────

    /**
     * Delegate the actual config file writing to writeConfigFromStore.
     *
     * This utility function is responsible for taking the InstallerState
     * and writing its values out to the appropriate local files, such as:
     *   - .env.local            (environment variables for the Next.js app)
     *   - nxt_flutter.config.json (runtime config consumed by the server)
     *
     * The function returns a result object that indicates whether the writes
     * succeeded. We pass that result directly back to the client.
     */
    const result = await writeConfigFromStore(body)

    return NextResponse.json(result)

  } catch {
    /**
     * Catch-all for any unexpected errors (JSON parse failure, filesystem
     * write error, missing directory, permissions issue, etc.).
     *
     * We return a generic failure message rather than the raw error —
     * error messages from filesystem operations can expose internal paths,
     * directory structures, or permission details that should not be sent
     * back to the client.
     */
    return NextResponse.json(
      { success: false, message: 'Failed to write configuration files' },
      { status: 500 }
    )
  }
}