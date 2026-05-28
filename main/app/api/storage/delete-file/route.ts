/**
 * DELETE /api/storage/delete-file
 *
 * A server-only Next.js Route Handler that deletes a file from cloud storage
 * and then removes its associated metadata record from the nxf_storage table.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` guard causes a build-time error if this file is
 * ever accidentally bundled into client-side code. File deletion uses storage
 * adapter credentials that must never be exposed to the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-phase deletion:
 * Deleting a file requires two separate operations:
 *
 * Phase 1 — Storage deletion:
 *   Removes the actual file binary from the cloud storage bucket
 *   (Firebase Storage, S3, GCS, etc.) via adapter.deleteFile().
 *   This is the primary operation. If it fails, the whole request fails.
 *
 * Phase 2 — Metadata cleanup:
 *   Removes the file's metadata record from the nxf_storage database table,
 *   which tracks file paths, sizes, upload dates, and other file information.
 *   This is a secondary "best-effort" operation. If it fails, we log a warning
 *   but still return success — the file is gone from storage, which is the
 *   critical outcome. A stale metadata record is a minor inconsistency that
 *   can be cleaned up separately, whereas blocking success on a metadata
 *   failure would mislead the client into thinking the file still exists.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (DELETE body — JSON):
 * {
 *   folder:   string   // The folder/prefix path containing the file
 *                      // (e.g. "uploads/avatars")
 *   fileName: string   // The file's name within that folder
 *                      // (e.g. "profile.jpg")
 * }
 *
 * The full storage path used internally is: `${folder}/${fileName}`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * { success: true }
 *
 * Failure (400 / 500):
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1. Parse and validate `folder` and `fileName` from the request body.
 * 2. Retrieve the storage adapter via getStorageAdapter().
 * 3. Confirm the adapter supports the deleteFile operation.
 * 4. Delete the file from cloud storage (Phase 1 — critical).
 * 5. Delete the file's metadata record from nxf_storage (Phase 2 — best-effort).
 * 6. Return { success: true } regardless of whether Phase 2 succeeded.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  try {

    // -----------------------------------------------------------------------
    // 1. Parse and validate the request body
    // -----------------------------------------------------------------------

    /**
     * Both `folder` and `fileName` are required to locate the file in storage.
     * Together they form the full file path: `${folder}/${fileName}`.
     *
     * Examples:
     *   folder:   "uploads/avatars"
     *   fileName: "profile.jpg"
     *   → full path: "uploads/avatars/profile.jpg"
     *
     * We reject immediately with a 400 if either is missing.
     */
    const { folder, fileName } = await req.json()
    if (!folder || !fileName)
      return NextResponse.json(
        { error: 'folder and fileName are required' },
        { status: 400 }
      )

    // -----------------------------------------------------------------------
    // 2. Retrieve the storage adapter
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns a provider-agnostic adapter object that
     * abstracts over Firebase Storage, S3, GCS, and other providers.
     * The correct adapter is selected automatically from environment variables.
     */
    const adapter = getConfiguredAdapter()

    // -----------------------------------------------------------------------
    // 3. Confirm the adapter supports file deletion
    // -----------------------------------------------------------------------

    /**
     * Not all storage adapters implement every operation. We check for the
     * presence of `deleteFile` before calling it to return a clear, actionable
     * 400 error rather than a confusing runtime crash.
     */
    if (!adapter.deleteFile)
      return NextResponse.json({ error: 'deleteFile not supported' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 4. Phase 1 — Delete the file from cloud storage (critical)
    // -----------------------------------------------------------------------

    /**
     * This is the primary deletion operation. If it throws for any reason
     * (file not found, permission denied, network error), the error propagates
     * to the outer catch block and we return a 500 to the client.
     *
     * We do NOT catch errors here intentionally — a failed storage deletion
     * means the file still exists and we must not return success.
     */
    await adapter.deleteFile(folder, fileName)
    console.log('[delete-file] File deleted from storage successfully')

    // -----------------------------------------------------------------------
    // 5. Phase 2 — Delete the metadata record from nxf_storage (best-effort)
    // -----------------------------------------------------------------------

    /**
     * After the file is removed from storage, we attempt to clean up its
     * metadata record from the nxf_storage database table.
     *
     * This is wrapped in its own try/catch because it is a secondary,
     * best-effort operation. If it fails (e.g. the record was already deleted,
     * the DB is temporarily unavailable), we log a warning and continue.
     *
     * We still return { success: true } because the file has been deleted from
     * storage — which is the outcome the client cares about. A stale metadata
     * record is a minor data inconsistency, not a critical failure.
     *
     * If `deleteStorageRecordByFilePath` is not implemented on the current
     * adapter, we log a warning and skip silently. This allows adapters that
     * don't use the nxf_storage table to work without modification.
     */
    try {
      const filePath = `${folder}/${fileName}`

      if (!adapter.deleteStorageRecordByFilePath) {
        console.warn('[delete-file] deleteStorageRecordByFilePath not implemented on this adapter — skipping metadata cleanup')
      } else {
        await adapter.deleteStorageRecordByFilePath(filePath)
        console.log('[delete-file] Metadata record removed from nxf_storage successfully')
      }
    } catch (dbErr: any) {
      /**
       * Log the warning with the error message so it is visible in server logs,
       * but do not re-throw. The client should not be told that metadata cleanup
       * failed — from their perspective, the file deletion succeeded.
       */
      console.warn('[delete-file] nxf_storage metadata cleanup failed (non-critical):', dbErr.message)
    }

    // -----------------------------------------------------------------------
    // 6. Return success
    // -----------------------------------------------------------------------

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[delete-file] Unhandled error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}