import 'server-only'

/**
 * API Route: POST /api/storage/move-file
 *
 * A server-side endpoint that moves a single file from one storage folder
 * to another using the project's configured storage adapter.
 *
 * What this route does:
 * 1. Reads three required fields from the JSON request body:
 *      - fromFolder: the folder the file currently lives in.
 *      - toFolder:   the folder the file should be moved to.
 *      - fileName:   the name of the file to move.
 * 2. Validates that all three fields are present — returns 400 if any
 *    are missing.
 * 3. Resolves the configured storage adapter for the project.
 * 4. Checks that the adapter supports the moveFile operation — returns
 *    400 if it does not, rather than throwing a confusing runtime error.
 * 5. Calls the adapter's moveFile method to perform the move.
 * 6. Returns { success: true } on completion.
 *
 * Authentication: None enforced at this layer (handled upstream/middleware)
 * Method:         POST
 * Body:           { fromFolder: string, toFolder: string, fileName: string }
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures storage credentials and internal folder structures are never
 * exposed to the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Moves a file from one storage folder to another.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @param req - The incoming Next.js server request. The JSON body must
 *              contain fromFolder, toFolder, and fileName.
 * @returns A NextResponse containing { success: true } on success,
 *          or { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'moveFile' namespace.
   * Because this is a server-only route we use getTranslations() (async)
   * rather than the client-side useTranslations() hook.
   */
  //const t = await getTranslations('moveFile')

  try {
    // ── Parse and validate request body ───────────────────────────────────

    /**
     * Extract the three required fields from the JSON request body:
     *
     * - fromFolder: where the file currently lives (e.g. 'uploads/temp')
     * - toFolder:   where the file should be moved to (e.g. 'uploads/avatars')
     * - fileName:   the name of the file to move (e.g. 'profile.png')
     */
    const { fromFolder, toFolder, fileName } = await req.json()

    /**
     * All three fields are required to perform a move operation.
     * If any one of them is missing or empty, return 400 Bad Request
     * immediately — the adapter cannot move a file without knowing
     * the source folder, destination folder, and file name.
     */
    if (!fromFolder || !toFolder || !fileName)
      return NextResponse.json(
        { error: ('errors.fieldsMissing') },
        { status: 400 }
      )

    // ── Resolve storage adapter ────────────────────────────────────────────

    /**
     * getStorageAdapter — Returns the storage adapter configured for this
     * project (e.g. Firebase Storage, AWS S3, local disk, etc.).
     * All file operations go through this adapter so the route works
     * regardless of which storage backend the project uses.
     */
    const adapter = getStorageAdapter()

    // ── Guard: adapter may not support moveFile ────────────────────────────

    /**
     * Not all storage adapters implement the moveFile method — for example,
     * a read-only or minimal adapter might omit it.
     *
     * We check for this explicitly and return a clear 400 error rather than
     * letting the code fall through to a confusing "adapter.moveFile is not
     * a function" runtime crash.
     */
    if (!adapter.moveFile)
      return NextResponse.json(
        { error: ('errors.moveFileNotSupported') },
        { status: 400 }
      )

    // ── Perform the move ───────────────────────────────────────────────────

    /**
     * Delegate the actual file move to the adapter.
     * The adapter is responsible for handling the underlying storage
     * operation (e.g. copy-then-delete in S3, rename in local disk, etc.).
     */
    await adapter.moveFile(fromFolder, toFolder, fileName)

    /**
     * The move completed successfully.
     * Return a simple success response — the client can use this to
     * update its UI or trigger a folder refresh.
     */
    return NextResponse.json({ success: true })

  } catch {
    /**
     * Catch-all for any unexpected errors (storage service down, bad
     * credentials, file not found, network timeout, etc.).
     *
     * We return a generic 500 without echoing back the raw error object
     * or its message — leaking internal storage paths, credentials, or
     * stack traces is a security risk.
     */
    return NextResponse.json(
      { error: ('errors.internalError') },
      { status: 500 }
    )
  }
}