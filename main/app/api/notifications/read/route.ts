/**
 * POST /api/notifications/mark-read
 *
 * A Next.js server-only API route that marks a single notification as read
 * for the currently authenticated user.
 *
 * This file uses 'server-only' at the top, which means Next.js will throw
 * a build error if this file is ever accidentally imported on the client side.
 * This is a safety measure to ensure sensitive logic (auth, database access)
 * never leaks to the browser.
 *
 * Request:
 * - Method:  POST
 * - Headers: Authorization: Bearer <token>
 *            Content-Type: application/json
 * - Body:    { notification_id: string }
 *
 * Response (success):
 * - 200 { success: true }
 *
 * Response (error):
 * - 400 { error: 'notification_id is required' } — Missing body field.
 * - 401 { error: 'Unauthorized' }                — No token provided.
 * - 401 { error: 'Invalid token' }               — Token could not be validated.
 * - 500 { error: string }                        — Unexpected server error.
 *
 * How it works (step by step):
 * 1. Reads `notification_id` from the request body — returns 400 if missing.
 * 2. Extracts the Bearer token from the Authorization header.
 * 3. Validates the token to confirm the user is authenticated.
 * 4. Updates the specified notification document in the `nxf_notifications`
 *    Firestore collection, setting:
 *      - `status`  → 'read'
 *      - `read_at` → the current ISO timestamp
 * 5. Returns { success: true } on completion.
 *
 * Note on ownership verification:
 * - This route currently trusts that the authenticated user owns the
 *   notification identified by `notification_id`. It does not explicitly
 *   verify that `recipient_user_id` on the notification matches `uid`.
 * - For additional security, consider fetching the document first and
 *   confirming ownership before performing the update.
 *
 * Note on idempotency:
 * - Calling this endpoint multiple times for the same notification is safe.
 *   Firestore will simply overwrite `status` and `read_at` with the same
 *   type of value each time — no side effects.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * POST handler
 *
 * Marks a single notification as read by updating its `status` to 'read'
 * and recording the `read_at` timestamp in Firestore.
 *
 * @param req - The incoming Next.js server request object.
 * @returns    A NextResponse with { success: true } or an error object.
 */
export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Parse and validate the request body
    // -----------------------------------------------------------------------

    /**
     * Extract `notification_id` from the JSON request body.
     * This is required — without it we don't know which notification
     * to mark as read, so we return 400 Bad Request immediately.
     */
    const { notification_id } = await req.json()

    if (!notification_id) {
      return NextResponse.json(
        { error: 'notification_id is required' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // Step 2: Extract and validate the auth token
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
    // Step 3: Validate the token and extract the user ID
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns the configured database/storage adapter.
     * We validate the session token to confirm the user is authenticated.
     * The uid confirms the requester is a valid user before we allow
     * any Firestore write to occur.
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

    console.log('[notifications/mark-read] Marking notification as read')

    // -----------------------------------------------------------------------
    // Step 4: Update the notification document in Firestore
    // -----------------------------------------------------------------------

    /**
     * Update the notification document identified by `notification_id`
     * in the `nxf_notifications` collection.
     *
     * Fields updated:
     * - `status`  → 'read'   — Changes the notification state from unread/active
     *                          to read, so it no longer appears as a new alert.
     * - `read_at` → ISO timestamp — Records the exact moment the user read it,
     *                               useful for analytics or audit purposes.
     *
     * We use `.update()` rather than `.set()` so that only these two fields
     * are changed — all other fields on the notification document are preserved.
     */
    await adapter.getFirestoreInstance?.()
      .collection('nxf_notifications')
      .doc(notification_id)
      .update({
        status:  'read',
        read_at: new Date().toISOString(),
      })

    console.log('[notifications/mark-read] Notification marked as read successfully')

    // -----------------------------------------------------------------------
    // Step 5: Return success
    // -----------------------------------------------------------------------

    return NextResponse.json({ success: true })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message server-side — never the full error object,
     * which could contain stack traces or internal implementation details.
     * Returns the error message to the client for basic debugging context.
     */
    console.error('[notifications/mark-read] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}