/**
 * POST /api/storage/create-folder
 *
 * A server-only Next.js Route Handler that creates a new folder (also called
 * a "prefix" or "directory") inside the configured cloud storage bucket.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` guard causes a build-time error if this file is
 * ever accidentally bundled into client-side code. Storage operations must run
 * on the server because they use credentials (service account keys, bucket
 * configs) that must never be exposed to the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What is a "folder" in cloud storage?
 * Cloud storage systems like Firebase Storage, AWS S3, and Google Cloud Storage
 * are not true file systems — they store flat key-value pairs where the "key"
 * is the full file path (e.g. "uploads/images/photo.jpg"). Folders don't
 * technically exist; they are simulated by path prefixes.
 *
 * Creating a "folder" typically means writing an empty placeholder object at
 * the folder path (e.g. "uploads/images/") so the folder appears in directory
 * listings. The exact implementation is handled by the storage adapter.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   folder: string   // The path of the folder to create (e.g. "uploads/images/")
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
 * 3. Confirm the adapter supports the createFolder operation.
 * 4. Call adapter.createFolder() to create the folder in the storage bucket.
 * 5. Return { success: true } on completion.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {

    // -----------------------------------------------------------------------
    // 1. Parse and validate the folder path
    // -----------------------------------------------------------------------

    /**
     * `folder` is the path string for the folder to create inside the storage
     * bucket (e.g. "uploads/avatars/" or "projects/abc123/assets/").
     *
     * We reject the request immediately with a 400 Bad Request if it is
     * missing or falsy, since there is nothing meaningful to do without it.
     */
    const { folder } = await req.json()
    if (!folder)
      return NextResponse.json({ error: 'folder is required' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 2. Retrieve the storage adapter
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns a storage-provider-agnostic adapter object
     * that abstracts over Firebase Storage, S3, GCS, and other providers.
     * The adapter is configured automatically from environment variables, so
     * the handler does not need to know which provider is in use.
     */
    const adapter = getStorageAdapter()

    // -----------------------------------------------------------------------
    // 3. Confirm the adapter supports folder creation
    // -----------------------------------------------------------------------

    /**
     * Not all storage adapters implement every operation. We check for the
     * presence of `createFolder` before calling it to avoid a runtime crash
     * with a confusing error message.
     *
     * If the method is missing, we return a clear 400 Bad Request that tells
     * the caller this operation is not available for the current storage
     * provider, rather than a generic 500 Internal Server Error.
     */
    if (!adapter.createFolder)
      return NextResponse.json({ error: 'createFolder not supported' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 4. Create the folder
    // -----------------------------------------------------------------------

    /**
     * Delegates to the adapter's createFolder implementation.
     * For most cloud storage providers this writes an empty placeholder object
     * at the given path so the folder appears in directory listings.
     * The adapter handles any provider-specific details (e.g. trailing slashes,
     * empty-file conventions, permission inheritance).
     */
    await adapter.createFolder(folder)

    // -----------------------------------------------------------------------
    // 5. Return success
    // -----------------------------------------------------------------------

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[create-folder] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}