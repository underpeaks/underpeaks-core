import 'server-only'

/**
 * API Route: GET /api/storage/list-files
 *
 * A server-side endpoint that returns a list of files stored inside a
 * specified folder in the project's configured storage backend.
 *
 * What this route does:
 * 1. Reads the `folder` query parameter from the request URL.
 *    Example URL: /api/storage/list-files?folder=uploads/avatars
 * 2. Resolves the correct storage adapter for the project (e.g. Firebase
 *    Storage, S3, local filesystem — whatever is configured).
 * 3. If the adapter does not support file listing, returns an empty array
 *    gracefully instead of throwing an error.
 * 4. Calls the adapter's listFiles method with the requested folder path
 *    and returns the resulting file list as JSON.
 *
 * Authentication: None enforced at this layer (handled upstream/middleware)
 * Method:         GET
 * Query params:   folder (string, required) — the folder path to list
 * Success:        { files: string[] }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures file system and storage credentials are never exposed to
 * the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

/**
 * GET
 *
 * Lists all files inside a given storage folder.
 * See the file-level JSDoc above for the full description.
 *
 * @param req - The incoming Next.js server request. The `folder` query
 *              parameter is read from the URL search params.
 * @returns A NextResponse containing { files: string[] } on success,
 *          or { error: string } on failure.
 */
export async function GET(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'listFiles' namespace.
   * Because this is a server-only route we use getTranslations() (async) rather
   * than the client-side useTranslations() hook.
   */
  //const t = await getTranslations('listFiles')

  try {
    // ── Read and validate query parameter ─────────────────────────────────

    /**
     * Extract the `folder` query parameter from the request URL.
     * This tells the adapter which folder to list files from.
     * Example: /api/storage/list-files?folder=uploads/avatars
     *          → folder = 'uploads/avatars'
     *
     * If the parameter is missing or empty, we cannot proceed — return 400.
     */
    const folder = req.nextUrl.searchParams.get('folder')
    if (!folder)
      return NextResponse.json(
        { error: ('errors.folderRequired') },
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

    // ── Guard: adapter may not support listing ─────────────────────────────

    /**
     * Not all storage adapters implement the listFiles method — for example,
     * a minimal or read-only adapter might omit it.
     *
     * Rather than throwing an error, we return an empty files array so the
     * calling code can handle the "no files" case gracefully without needing
     * to know whether the adapter supports listing or not.
     */
    if (!adapter.listFiles)
      return NextResponse.json({ files: [] })

    // ── List files ─────────────────────────────────────────────────────────

    /**
     * Ask the adapter to list all files inside the requested folder.
     * The return value is an array of file paths or URLs, depending on
     * the adapter implementation.
     */
    const files = await adapter.listFiles(folder)

    /**
     * Return the file list to the client as JSON.
     */
    return NextResponse.json({ files })

  } catch {
    /**
     * Catch-all for any unexpected errors (storage service down, bad
     * credentials, network timeout, etc.).
     *
     * We return a generic 500 without echoing back the raw error object or
     * its message — leaking internal storage paths, credentials, or stack
     * traces is a security risk.
     */
    return NextResponse.json(
      { error: ('errors.internalError') },
      { status: 500 }
    )
  }
}