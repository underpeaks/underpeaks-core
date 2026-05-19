/**
 * GET /api/notifications/list
 *
 * A Next.js server-only API route that fetches the most recent notifications
 * for the currently authenticated user.
 *
 * This file uses 'server-only' at the top, which means Next.js will throw
 * a build error if this file is ever accidentally imported on the client side.
 * This is a safety measure to ensure sensitive logic (auth, database access)
 * never leaks to the browser.
 *
 * Request:
 * - Method:  GET
 * - Headers: Authorization: Bearer <token>
 *
 * Response (success):
 * - 200 { notifications: Notification[] }
 *   Returns up to 20 notifications for the user, excluding deleted ones,
 *   ordered by status first, then by most recently created.
 *
 * Response (error):
 * - 401 { error: 'Unauthorized' }  — No token provided.
 * - 401 { error: 'Invalid token' } — Token could not be validated.
 * - 500 { error: string }          — Unexpected server error.
 *
 * How it works (step by step):
 * 1. Extracts the Bearer token from the Authorization header.
 * 2. Validates the token using the storage adapter's session validator.
 * 3. Queries the `nxf_notifications` Firestore collection for all
 *    notifications where:
 *      - `recipient_user_id` matches the authenticated user's ID
 *      - `status` is NOT 'deleted' (soft-deleted notifications are excluded)
 * 4. Orders results by `status` first (so unread/active appear before read),
 *    then by `created_at` descending (newest first within each status group).
 * 5. Limits the result to 20 notifications to keep the response fast.
 * 6. Returns the notifications array.
 *
 * Note on the compound orderBy:
 * - Firestore requires that when you use `!=` in a where clause, the field
 *   being filtered must also be the first field in the orderBy chain.
 *   This is why we orderBy('status') before orderBy('created_at', 'desc').
 *   See: https://firebase.google.com/docs/firestore/query-data/queries#not_equal
 *
 * Note on pagination:
 * - This route returns a fixed maximum of 20 notifications.
 *   For users with many notifications, consider adding cursor-based
 *   pagination (using Firestore's startAfter) in a future iteration.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * GET handler
 *
 * Fetches up to 20 active (non-deleted) notifications for the authenticated
 * user, ordered by status then by creation date descending.
 *
 * @param req - The incoming Next.js server request object.
 * @returns    A NextResponse containing the notifications array or an error.
 */
export async function GET(req: NextRequest) {
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
     * getStorageAdapter() returns the configured database/storage adapter
     * (e.g. Firebase, Supabase, custom). We validate the session token to
     * confirm the user is authenticated and to get their user ID.
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

    console.log('[notifications/list] Fetching notifications for user')

    // -----------------------------------------------------------------------
    // Step 3: Query notifications for this user
    // -----------------------------------------------------------------------

    /**
     * Query the `nxf_notifications` Firestore collection.
     *
     * Filters applied:
     * - `recipient_user_id == uid`  — Only return notifications for this user.
     * - `status != 'deleted'`       — Exclude soft-deleted notifications.
     *                                  Soft deletion means the document stays
     *                                  in Firestore but is hidden from the user.
     *
     * Ordering:
     * - `orderBy('status')`         — Required by Firestore when using `!=`.
     *                                  See the file-level note for explanation.
     * - `orderBy('created_at', 'desc')` — Newest notifications first within
     *                                      each status group.
     *
     * Limit:
     * - `.limit(20)`                — Cap at 20 results to keep response fast.
     */
    const snapshot = await adapter.getFirestoreInstance?.()
      .collection('nxf_notifications')
      .where('recipient_user_id', '==', uid)
      .where('status', '!=', 'deleted')
      .orderBy('status')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get()

    /**
     * Map each Firestore document into a plain object.
     * `doc.id` is the Firestore document ID; `doc.data()` contains the fields.
     * Falls back to an empty array if the snapshot is undefined.
     */
    const notifications = snapshot?.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) ?? []

    console.log(`[notifications/list] Returning ${notifications.length} notifications`)

    // -----------------------------------------------------------------------
    // Step 4: Return the notifications array
    // -----------------------------------------------------------------------

    return NextResponse.json({ notifications })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message server-side — never the full error object,
     * which could contain stack traces or internal implementation details.
     * Returns the error message to the client for basic debugging context.
     */
    console.error('[notifications/list] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}