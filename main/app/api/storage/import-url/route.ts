/**
 * POST /api/storage/import-url
 *
 * A server-only Next.js Route Handler that downloads a file from a remote URL
 * and saves it directly into the configured cloud storage bucket, then records
 * its metadata in the nxf_storage database table.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` guard causes a build-time error if this file is
 * ever accidentally bundled into client-side code. This handler fetches remote
 * files and writes to storage using server-side credentials that must never
 * be exposed to the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why import from a URL on the server rather than the client?
 * Fetching a remote file directly from the server avoids CORS restrictions
 * that would block many cross-origin URLs in the browser. It also means the
 * file never passes through the client's machine — the server streams it
 * straight from the source into storage, which is faster and more reliable
 * for large files.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-phase operation (mirrors delete-file):
 *
 * Phase 1 — Storage import (critical):
 *   Downloads the file from the remote URL and saves it to the cloud storage
 *   bucket under the given folder path via adapter.importFromUrl().
 *   If this fails, the whole request fails.
 *
 * Phase 2 — Metadata save (best-effort):
 *   Records the file's details (name, path, URL, MIME type, size, etc.) in the
 *   nxf_storage database table so the file appears in the media library and can
 *   be queried later. If this fails, we log a warning but still return success
 *   — the file is safely stored, which is the critical outcome. A missing
 *   metadata record can be backfilled; a failed import cannot be undone.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication (optional):
 * If an "Authorization: Bearer <token>" header is present, this handler resolves
 * the requesting user's project_id and attaches it to the nxf_storage metadata
 * record. This links the imported file to the correct project in the database.
 *
 * The auth lookup is wrapped in its own try/catch so that a missing or invalid
 * token does not block the import — project_id simply stays null. This makes
 * the endpoint usable in both authenticated and unauthenticated contexts.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   folder: string   // The destination folder path in storage (e.g. "uploads/images")
 *   url:    string   // The fully-qualified remote URL to download (e.g. "https://...")
 * }
 *
 * Optionally include "Authorization: Bearer <token>" header to associate the
 * imported file with the authenticated user's project.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * {
 *   success: true,
 *   file: {
 *     name:       string,   // File name as stored in the bucket
 *     folderPath: string,   // Full path within the bucket
 *     url:        string,   // Public or signed URL to access the stored file
 *     mimeType:   string,   // Detected MIME type (e.g. "image/jpeg")
 *     size:       string,   // File size in bytes (as a string from the adapter)
 *   }
 * }
 *
 * Failure (400 / 500):
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1. Parse and validate `folder` and `url` from the request body.
 * 2. Optionally resolve the user's project_id from the Authorization header.
 * 3. Confirm the adapter supports the importFromUrl operation.
 * 4. Download the remote file and save it to storage (Phase 1 — critical).
 * 5. Save the file's metadata to the nxf_storage table (Phase 2 — best-effort).
 * 6. Return { success: true, file } with the stored file's details.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 }              from 'uuid'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {

    // -----------------------------------------------------------------------
    // 1. Parse and validate the request body
    // -----------------------------------------------------------------------

    /**
     * Both `folder` and `url` are required:
     * - `folder` tells the adapter where in the bucket to save the file.
     * - `url` is the remote source the adapter will download the file from.
     *
     * We reject with a 400 if either is missing or falsy.
     */
    const { folder, url } = await req.json()
    if (!folder || !url)
      return NextResponse.json(
        { error: 'folder and url are required' },
        { status: 400 }
      )

    // -----------------------------------------------------------------------
    // 2. Optionally resolve project_id from the Authorization header
    // -----------------------------------------------------------------------

    /**
     * We attempt to identify the requesting user and look up their project_id
     * so the imported file can be linked to the correct project in nxf_storage.
     *
     * This entire block is wrapped in try/catch so that auth failures (missing
     * header, expired token, no project found) are non-fatal. If anything goes
     * wrong here, `project_id` stays null and the import continues normally.
     * The metadata record will simply have a null project_id.
     *
     * Flow:
     * 1. Read the Bearer token from the Authorization header.
     * 2. Validate it via the adapter to get the user's UID.
     * 3. Look up the project that belongs to that UID.
     * 4. Extract the project_id from the result (handles both `id` and
     *    `project_id` field names since adapters may differ).
     */
    let project_id: string | null = null

    try {
      const authHeader = req.headers.get('Authorization')
      const token      = authHeader?.replace('Bearer ', '') ?? null

      if (token) {
        const adapter = getConfiguredAdapter()
        const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
        const uid     = decoded?.uid ?? decoded?.user_id ?? null

        if (uid) {
          const project = await adapter.findProjectByOwnerId?.(adapter.config, uid)
          project_id    = project?.id ?? project?.project_id ?? null
          console.log('[import-url] project_id resolved successfully')
        }
      }
    } catch (err: any) {
      console.warn('[import-url] project_id lookup failed (non-fatal):', err.message)
    }

    // -----------------------------------------------------------------------
    // 3. Retrieve the adapter and confirm importFromUrl is supported
    // -----------------------------------------------------------------------

    /**
     * We call getStorageAdapter() again here (rather than reusing the one
     * from the auth block above) because the auth block may have been skipped
     * entirely if no token was provided. This guarantees `adapter` is always
     * initialised before we use it below.
     */
    const adapter = getConfiguredAdapter()
    if (!adapter.importFromUrl)
      return NextResponse.json(
        { error: 'importFromUrl not supported' },
        { status: 400 }
      )

    // -----------------------------------------------------------------------
    // 4. Phase 1 — Download and store the file (critical)
    // -----------------------------------------------------------------------

    /**
     * The adapter downloads the file from the remote `url` and saves it into
     * the bucket under `folder`. The returned `file` object contains the stored
     * file's metadata (name, path, public URL, MIME type, size).
     *
     * We do NOT catch errors here intentionally. If the download or storage
     * write fails, the error propagates to the outer catch and we return a 500.
     * There is no partial success state for Phase 1.
     */
    const file = await adapter.importFromUrl(folder, url)

    // -----------------------------------------------------------------------
    // 5. Phase 2 — Save metadata to nxf_storage (best-effort)
    // -----------------------------------------------------------------------

    /**
     * We record the imported file's details in the nxf_storage table so it
     * appears in the media library and can be queried, filtered, and managed.
     *
     * Fields saved:
     * - storage_id: a new UUID generated here — unique identifier for this record.
     * - project_id: the resolved project (null if auth was not provided).
     * - folder:     the destination folder path used in Phase 1.
     * - file_name:  the file's name as saved in the bucket.
     * - file_path:  the full path within the bucket.
     * - url:        the public/signed URL to access the file.
     * - mime_type:  the detected content type (e.g. "image/png").
     * - size:       file size in bytes. We parse to int and fall back to 0
     *               because the adapter returns size as a string, and some
     *               providers may return an empty or non-numeric value.
     * - created_at: ISO timestamp of when this record was created.
     *
     * This block is wrapped in its own try/catch so a database failure does
     * not cause the endpoint to return an error — the file is already safely
     * stored in Phase 1, and a missing metadata record is a recoverable
     * inconsistency rather than a critical failure.
     */
    try {
      if (adapter.create) {
        await adapter.create(adapter.config, 'nxf_storage', {
          storage_id: uuidv4(),
          project_id: project_id ?? null,
          folder,
          file_name:  file.name,
          file_path:  file.folderPath,
          url:        file.url,
          mime_type:  file.mimeType,
          size:       parseInt(file.size) || 0,
          created_at: new Date().toISOString(),
        })
        console.log('[import-url] File metadata saved to nxf_storage successfully')
      }
    } catch (dbErr: any) {
      console.warn('[import-url] Metadata save to nxf_storage failed (non-fatal):', dbErr.message)
    }

    // -----------------------------------------------------------------------
    // 6. Return the stored file's details
    // -----------------------------------------------------------------------

    return NextResponse.json({ success: true, file })

  } catch (err: any) {
    console.error('[import-url] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}