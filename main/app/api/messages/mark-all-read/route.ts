/**
 * POST /api/messages/mark-all-read
 *
 * A Next.js server-only API route that marks all unread messages
 * as read for the currently authenticated user.
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
 * 2. Validates the token using the storage adapter's session validator.
 * 3. Queries Firestore for all messages where:
 *      - `recipient_id` matches the authenticated user's ID
 *      - `is_read` is false (i.e. unread)
 * 4. Uses a Firestore batch write to update all matching messages at once,
 *    setting `is_read: true` and `updated_at` to the current timestamp.
 * 5. Commits the batch and returns { success: true }.
 *
 * Why use a batch write?
 * A Firestore batch write groups multiple update operations into a single
 * atomic request. This means either ALL messages are marked as read, or
 * NONE are (if an error occurs) — preventing partial updates where some
 * messages are marked read and others are not.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * POST handler
 *
 * Marks all unread messages for the authenticated user as read
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
     * and to retrieve their user ID.
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

    console.log('[messages/mark-all-read] Fetching unread messages for user')

    // -----------------------------------------------------------------------
    // Step 3: Query all unread messages for this user
    // -----------------------------------------------------------------------

    /**
     * Get the Firestore database instance from the adapter.
     * We reuse this reference for both the query and the batch write below.
     */
    const db = adapter.getFirestoreInstance?.()

    /**
     * Query the `nxf_messages` collection for all messages where:
     * - `recipient_id` equals the current user's ID (their messages only)
     * - `is_read` is false (unread messages only)
     *
     * We do NOT limit this query — we want to mark ALL unread messages as
     * read, not just the most recent ones.
     */
    const snapshot = await db
      .collection('nxf_messages')
      .where('recipient_id', '==', uid)
      .where('is_read',      '==', false)
      .get()

    console.log(`[messages/mark-all-read] Found ${snapshot?.size ?? 0} unread messages`)

    // -----------------------------------------------------------------------
    // Step 4: Batch update all unread messages to is_read: true
    // -----------------------------------------------------------------------

    /**
     * Create a Firestore batch write.
     *
     * A batch allows us to group multiple document updates into one atomic
     * operation — either all succeed or all fail together. This prevents
     * partial updates (e.g. only some messages getting marked as read).
     *
     * We loop through each unread message document and add an update
     * operation to the batch for each one:
     * - `is_read: true`    — marks the message as read
     * - `updated_at`       — records when the read status was changed
     */
    const batch = db.batch()

    snapshot?.docs.forEach((doc: any) => {
      batch.update(doc.ref, {
        is_read:    true,
        updated_at: new Date().toISOString(),
      })
    })

    // -----------------------------------------------------------------------
    // Step 5: Commit the batch and return success
    // -----------------------------------------------------------------------

    /**
     * Commit sends all the queued batch operations to Firestore at once.
     * After this resolves, all matched messages are marked as read.
     */
    await batch.commit()

    console.log('[messages/mark-all-read] All unread messages marked as read')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message server-side — never the full error object,
     * which could contain stack traces or internal implementation details.
     * Returns the error message to the client for basic debugging context.
     */
    console.error('[messages/mark-all-read] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}