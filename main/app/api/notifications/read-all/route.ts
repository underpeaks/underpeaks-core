/**
 * POST /api/notifications/mark-all-read
 *
 * A Next.js server-only API route that marks ALL unread notifications
 * as read for the currently authenticated user in a single atomic operation.
 *
 * This is the bulk version of /api/notifications/mark-read — instead of
 * marking one specific notification, this marks every unread notification
 * belonging to the user. It is typically triggered when the user clicks
 * a "Mark all as read" button in the notifications panel.
 *
 * This file uses 'server-only' at the top, which means Next.js will throw
 * a build error if this file is ever accidentally imported on the client side.
 * This is a safety measure to ensure sensitive logic (auth, database access)
 * never leaks to the browser.
 *
 * Request:
 * - Method:  POST
 * - Headers: Authorization: Bearer <token>
 * - Body:    None required
 *
 * Response (success):
 * - 200 { success: true }
 *
 * Response (error):
 * - 401 { error: 'Unauthorized' }  — No token provided.
 * - 401 { error: 'Invalid token' } — Token could not be validated.
 * - 500 { error: string }          — Unexpected server error.
 *
 * How it works (step by step):
 * 1. Extracts the Bearer token from the Authorization header.
 * 2. Validates the token to confirm the user is authenticated.
 * 3. Queries the `nxf_notifications` Firestore collection for all documents
 *    where `recipient_user_id` matches the user's ID and `status` is 'unread'.
 * 4. Uses a Firestore batch write to atomically update all matched documents,
 *    setting `status` to 'read' and recording the `read_at` timestamp.
 * 5. Commits the batch and returns { success: true }.
 *
 * Why use a batch write?
 * A Firestore batch write groups multiple update operations into a single
 * atomic request. Either ALL unread notifications are marked as read,
 * or NONE are — preventing partial updates where only some notifications
 * get marked while others remain unread due to a mid-operation failure.
 *
 * Note on idempotency:
 * - If no unread notifications exist, the batch will be empty and `.commit()`
 *   is a no-op. The endpoint still returns { success: true }, which is correct
 *   behaviour — there was nothing to do, and that is not an error.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * POST handler
 *
 * Marks all unread notifications for the authenticated user as read
 * using a Firestore batch write.
 *
 * @param req - The incoming Next.js server request object.
 * @returns    A NextResponse with { success: true } or an error object.
 */
export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Extract and validate the auth token
    // -----------------------------------------------------------------------

    /**
     * Read the Authorization header from the request.
     * Expected format: "Bearer <token>"
     * We strip the "Bearer " prefix to get the raw token string.
     */
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token) {
      // No token provided — reject immediately with 401 Unauthorized
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // -----------------------------------------------------------------------
    // Step 2: Validate the token and extract the user ID
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns the configured database/storage adapter.
     * We validate the session token to confirm the user is authenticated
     * and to retrieve their user ID, which scopes the query to their
     * notifications only.
     */
    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)

    /**
     * Extract the user ID from the decoded token.
     * Different adapters may use `uid` or `user_id` — we handle both.
     */
    const uid = decoded?.uid ?? decoded?.user_id ?? null

    if (!uid) {
      // Token was provided but could not be validated — reject with 401
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('[notifications/mark-all-read] Fetching unread notifications for user')

    // -----------------------------------------------------------------------
    // Step 3: Query all unread notifications for this user
    // -----------------------------------------------------------------------

    /**
     * Get the Firestore database instance from the adapter.
     * Reused for both the query and the batch write below.
     */
    const db = adapter.getFirestoreInstance?.()

    /**
     * Query the `nxf_notifications` collection for all documents where:
     * - `recipient_user_id` matches the current user's ID — ensures we only
     *   update notifications that belong to this user, not other users'.
     * - `status` is 'unread' — only target notifications that haven't been
     *   read yet; already-read notifications don't need updating.
     */
    const snapshot = await db
      .collection('nxf_notifications')
      .where('recipient_user_id', '==', uid)
      .where('status', '==', 'unread')
      .get()

    console.log(`[notifications/mark-all-read] Found ${snapshot?.size ?? 0} unread notifications`)

    // -----------------------------------------------------------------------
    // Step 4: Batch update all unread notifications to status 'read'
    // -----------------------------------------------------------------------

    /**
     * Create a Firestore batch write.
     *
     * A batch allows us to group multiple document updates into one atomic
     * operation — either all succeed or all fail together. This prevents
     * partial updates where only some notifications are marked as read.
     *
     * For each unread notification document we add an update to the batch:
     * - `status`  → 'read'          — Changes the notification from unread to read.
     * - `read_at` → ISO timestamp   — Records exactly when the user read it.
     *
     * We use `.update()` within the batch (not `.set()`) to preserve all
     * other fields on each notification document.
     */
    const batch = db.batch()

    snapshot?.docs.forEach((doc: any) => {
      batch.update(doc.ref, {
        status:  'read',
        read_at: new Date().toISOString(),
      })
    })

    // -----------------------------------------------------------------------
    // Step 5: Commit the batch and return success
    // -----------------------------------------------------------------------

    /**
     * Commit sends all the queued batch operations to Firestore at once.
     * After this resolves, all matched unread notifications are marked as read.
     * If the snapshot was empty, this is a no-op and still resolves cleanly.
     */
    await batch.commit()

    console.log('[notifications/mark-all-read] All unread notifications marked as read')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message server-side — never the full error object,
     * which could contain stack traces or internal implementation details.
     * Returns the error message to the client for basic debugging context.
     */
    console.error('[notifications/mark-all-read] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}