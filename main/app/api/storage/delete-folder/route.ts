/**
 * DELETE /api/storage/delete-folder
 *
 * A server-only Next.js Route Handler that deletes an entire folder (and all
 * of its contents) from the configured cloud storage bucket.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` guard causes a build-time error if this file is
 * ever accidentally bundled into client-side code. Folder deletion uses storage
 * adapter credentials that must never be exposed to the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  This is a destructive, recursive operation.
 * Unlike deleting a single file, deleting a folder removes everything stored
 * under that path prefix — all files and any nested sub-folders — in one call.
 * There is no built-in undo. The adapter is responsible for listing and
 * deleting all objects under the prefix before removing the folder itself.
 *
 * Always confirm with the user before calling this endpoint from the UI.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What is a "folder" in cloud storage?
 * Cloud storage providers (Firebase Storage, S3, GCS) do not have true folders.
 * Files are stored as flat key-value pairs where the key is the full path
 * (e.g. "uploads/avatars/photo.jpg"). A "folder" is a shared path prefix.
 * Deleting a folder means finding and deleting every object whose key starts
 * with that prefix. The adapter handles this enumeration internally.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (DELETE body — JSON):
 * {
 *   folder: string   // The folder path/prefix to delete (e.g. "uploads/avatars")
 * }
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
 * 1. Parse and validate the `folder` path from the request body.
 * 2. Retrieve the storage adapter via getStorageAdapter().
 * 3. Confirm the adapter supports the deleteFolder operation.
 * 4. Call adapter.deleteFolder() to recursively delete all contents and the
 *    folder itself from the storage bucket.
 * 5. Return { success: true } on completion.
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
    // 1. Parse and validate the folder path
    // -----------------------------------------------------------------------

    /**
     * `folder` is the path prefix identifying the folder to delete in the
     * storage bucket (e.g. "uploads/avatars" or "projects/abc123/assets").
     *
     * We reject immediately with a 400 Bad Request if it is missing or falsy.
     * Without a folder path we have no safe target for deletion — and we must
     * never attempt to delete an undefined or empty prefix, as that could
     * accidentally match and wipe unintended files in the bucket.
     */
    const { folder } = await req.json()
    if (!folder)
      return NextResponse.json({ error: 'folder is required' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 2. Retrieve the storage adapter
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns a provider-agnostic adapter that abstracts
     * over Firebase Storage, S3, GCS, and other providers. The correct adapter
     * is selected automatically from environment variables at runtime.
     */
    const adapter = getConfiguredAdapter()

    // -----------------------------------------------------------------------
    // 3. Confirm the adapter supports folder deletion
    // -----------------------------------------------------------------------

    /**
     * Not all storage adapters implement every operation. We check for the
     * presence of `deleteFolder` before calling it to return a clear,
     * actionable 400 error rather than a confusing "not a function" crash.
     *
     * If your storage provider does not support this operation, you will need
     * to implement `deleteFolder` in its adapter before using this endpoint.
     */
    if (!adapter.deleteFolder)
      return NextResponse.json({ error: 'deleteFolder not supported' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 4. Delete the folder and all of its contents
    // -----------------------------------------------------------------------

    /**
     * Delegates to the adapter's deleteFolder implementation, which is
     * responsible for:
     * 1. Listing every object stored under the given path prefix.
     * 2. Deleting each object individually (cloud storage has no native
     *    recursive delete — the adapter must do this manually).
     * 3. Removing the folder placeholder object itself (if one exists).
     *
     * If the folder does not exist, the adapter may either resolve silently
     * or throw — behaviour depends on the provider. Check the adapter's
     * implementation if you need to handle the "folder not found" case.
     */
    await adapter.deleteFolder(folder)
    console.log('[delete-folder] Folder deleted from storage successfully')

    // -----------------------------------------------------------------------
    // 5. Return success
    // -----------------------------------------------------------------------

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[delete-folder] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}