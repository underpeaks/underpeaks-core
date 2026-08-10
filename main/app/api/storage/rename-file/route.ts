import 'server-only'

/**
 * API Route: POST /api/storage/rename-file
 *
 * A server-side endpoint that renames a single file within a storage folder
 * using the project's configured storage adapter.
 *
 * What this route does:
 * 1. Reads three required fields from the JSON request body:
 *      - folder:   the folder where the file currently lives.
 *      - oldName:  the current name of the file.
 *      - newName:  the new name to give the file.
 * 2. Validates that all three fields are present — returns 400 if any
 *    are missing.
 * 3. Resolves the configured storage adapter for the project.
 * 4. Checks that the adapter supports the renameFile operation — returns
 *    400 if it does not, rather than throwing a confusing runtime error.
 * 5. Calls the adapter's renameFile method to perform the rename.
 * 6. Returns { success: true } on completion.
 *
 * Authentication: None enforced at this layer (handled upstream/middleware)
 * Method:         POST
 * Body:           { folder: string, oldName: string, newName: string }
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures storage credentials and internal folder structures are never
 * exposed to the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Renames a file within a storage folder.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @param req - The incoming Next.js server request. The JSON body must
 *              contain folder, oldName, and newName.
 * @returns A NextResponse containing { success: true } on success,
 *          or { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Parse and validate request body ───────────────────────────────────

    /**
     * Extract the three required fields from the JSON request body:
     *
     * - folder:  the folder containing the file (e.g. 'uploads/avatars')
     * - oldName: the file's current name      (e.g. 'profile_old.png')
     * - newName: the name to rename it to     (e.g. 'profile.png')
     */
    const { folder, oldName, newName } = await req.json()

    /**
     * All three fields are required to perform a rename operation.
     * If any one of them is missing or empty, return 400 Bad Request
     * immediately — the adapter cannot rename a file without knowing
     * which folder it lives in, what it is currently called, and what
     * it should be called after the rename.
     */
    if (!folder || !oldName || !newName)
      return NextResponse.json(
        { error: 'folder, oldName, and newName are all required' },
        { status: 400 }
      )

    // ── Resolve storage adapter ────────────────────────────────────────────

    /**
     * getStorageAdapter — Returns the storage adapter configured for this
     * project (e.g. Firebase Storage, AWS S3, local disk, etc.).
     * All file operations go through this adapter so the route works
     * regardless of which storage backend the project uses.
     */
    const adapter = getConfiguredAdapter()

    // ── Guard: adapter may not support renameFile ──────────────────────────

    /**
     * Not all storage adapters implement the renameFile method — for example,
     * a read-only or minimal adapter might omit it.
     *
     * We check for this explicitly and return a clear 400 error rather than
     * letting the code fall through to a confusing "adapter.renameFile is not
     * a function" runtime crash.
     */
    if (!adapter.renameFile)
      return NextResponse.json(
        { error: 'File rename is not supported by the current storage adapter' },
        { status: 400 }
      )

    // ── Perform the rename ─────────────────────────────────────────────────

    /**
     * Delegate the actual file rename to the adapter.
     * The adapter is responsible for handling the underlying storage
     * operation (e.g. copy-then-delete in S3, fs.rename on local disk, etc.).
     */
    await adapter.renameFile(folder, oldName, newName)

    /**
     * The rename completed successfully.
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}