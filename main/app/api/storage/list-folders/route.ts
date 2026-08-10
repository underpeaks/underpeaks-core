import 'server-only'

/**
 * API Route: GET /api/storage/list-folders
 *
 * A server-side endpoint that returns a list of all storage folders,
 * each enriched with a file count where possible.
 *
 * What this route does:
 * 1. Resolves the configured storage adapter for the project.
 * 2. If the adapter does not support folder listing, returns an empty
 *    array gracefully instead of throwing an error.
 * 3. If the adapter returns folder data that is already enriched (i.e.
 *    objects that already contain a name and count), it returns them
 *    directly without any extra work.
 * 4. If the adapter returns plain folder name strings, it enriches each
 *    one by fetching the file count for that folder. Each folder becomes
 *    an object of shape { name: string, count: number }.
 *    If counting files in a particular folder fails, that folder's count
 *    safely defaults to 0 rather than failing the whole request.
 *
 * Authentication: None enforced at this layer (handled upstream/middleware)
 * Method:         GET
 * Query params:   None
 * Success:        { folders: { name: string, count: number }[] }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures storage credentials and internal folder structures are never
 * exposed to the browser.
 */

import { NextResponse }      from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

/**
 * GET
 *
 * Lists all storage folders, enriching each with a file count if the adapter
 * returns plain strings rather than pre-enriched objects.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @returns A NextResponse containing { folders: { name: string, count: number }[] }
 *          on success, or { error: string } on failure.
 */
export async function GET() {
  try {
    // ── Resolve storage adapter ──────────────────────────────────────────────

    /**
     * getStorageAdapter — Returns the storage adapter configured for this
     * project (e.g. Firebase Storage, AWS S3, local disk, etc.).
     * All file and folder operations go through this adapter so the route
     * works regardless of which storage backend the project uses.
     */
    const adapter = getConfiguredAdapter()

    // ── Guard: adapter may not support folder listing ────────────────────────

    /**
     * Not all storage adapters implement the listFolders method.
     * Rather than throwing an error, we return an empty folders array so
     * the calling code can handle the "no folders" case gracefully without
     * needing to know whether the adapter supports this operation or not.
     */
    if (!adapter.listFolders)
      return NextResponse.json({ folders: [] })

    // ── Fetch folders from adapter ───────────────────────────────────────────

    /**
     * Ask the adapter for all available folders in storage.
     * The return value may be either:
     *   a) An array of plain strings  — e.g. ['avatars', 'documents']
     *   b) An array of enriched objects — e.g. [{ name: 'avatars', count: 12 }]
     * We handle both cases below.
     */
    const folders = await adapter.listFolders()

    /**
     * If the adapter returned no folders at all, return an empty array
     * immediately — no further processing needed.
     */
    if (folders.length === 0)
      return NextResponse.json({ folders: [] })

    // ── Determine whether folders are already enriched ───────────────────────

    /**
     * Detect the shape of the first item to decide which path to take:
     *
     * - If it is an object  → the adapter already provided enriched data
     *   (name + count) so we can return it as-is.
     * - If it is a string   → the adapter returned plain folder names and
     *   we need to fetch file counts ourselves to enrich them.
     */
    const isEnriched = typeof folders[0] === 'object'

    if (isEnriched) {
      /**
       * The adapter already returned enriched folder objects.
       * Return them directly without any extra fetching.
       */
      return NextResponse.json({ folders })
    }

    // ── Enrich plain strings with file counts ────────────────────────────────

    /**
     * The adapter returned plain folder name strings.
     * For each folder name, we attempt to list its files and use the
     * array length as the file count.
     *
     * We use Promise.all so all folder counts are fetched in parallel,
     * which is much faster than fetching them one by one in a loop.
     *
     * Each individual folder is wrapped in its own try/catch so that
     * a failure to count one folder does not abort the entire request —
     * that folder simply gets a count of 0.
     */
    const enriched = await Promise.all(
      (folders as unknown as string[]).map(async (name) => {
        try {
          const files = adapter.listFiles ? await adapter.listFiles(name) : []
          return { name, count: files.length }
        } catch {
          /**
           * If listing files for this specific folder fails (e.g. permission
           * error, folder no longer exists), default its count to 0 rather
           * than failing the whole response.
           */
          return { name, count: 0 }
        }
      })
    )

    console.log('[list-folders] Folders enriched with file counts')
    return NextResponse.json({ folders: enriched })

  } catch {
    /**
     * Catch-all for any unexpected errors (storage service down, bad
     * credentials, network timeout, adapter misconfiguration, etc.).
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