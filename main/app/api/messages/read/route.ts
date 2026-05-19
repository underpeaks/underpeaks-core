/**
 * POST /api/messages/mark-read
 *
 * A Next.js server-only API route that marks all unread messages
 * within a specific conversation as read for the authenticated user.
 *
 * This is more targeted than /api/messages/mark-all-read — instead of
 * marking every unread message across all conversations, this only affects
 * messages within a single specified conversation. This is typically called
 * when the user opens or views a specific conversation thread.
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
 * - Body:    { conversation_id: string }
 *
 * Response (success):
 * - 200 { success: true }
 *
 * Response (error):
 * - 400 { error: 'conversation_id is required' } — Missing body field.
 * - 401 { error: 'Unauthorized' }                — No token provided.
 * - 401 { error: 'Invalid token' }               — Token could not be validated.
 * - 500 { error: string }                        — Unexpected server error.
 *
 * How it works (step by step):
 * 1. Reads `conversation_id` from the request body — returns 400 if missing.
 * 2. Extracts the Bearer token from the Authorization header.
 * 3. Validates the token to confirm the user is authenticated.
 * 4. Queries Firestore for all messages in the given conversation where:
 *      - `conversation_id` matches the provided ID
 *      - `recipient_id` matches the authenticated user's ID
 *      - `is_read` is false (unread only)
 * 5. Uses a Firestore batch write to atomically set `is_read: true`
 *    and `updated_at` on all matched messages.
 * 6. Commits the batch and returns { success: true }.
 *
 * Why use a batch write?
 * A Firestore batch write groups multiple update operations into a single
 * atomic request. Either ALL messages in the conversation are marked as read,
 * or NONE are — preventing partial updates.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * POST handler
 *
 * Marks all unread messages in a specific conversation as read
 * for the authenticated user, using a Firestore batch write.
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
     * Extract `conversation_id` from the JSON request body.
     * This is required — without it we don't know which conversation
     * to mark as read, so we return a 400 Bad Request immediately.
     */
    const { conversation_id } = await req.json()

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
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

    console.log('[messages/mark-read] Fetching unread messages for conversation')

    // -----------------------------------------------------------------------
    // Step 4: Query all unread messages in this conversation for this user
    // -----------------------------------------------------------------------

    /**
     * Get the Firestore database instance from the adapter.
     * Reused for both the query and the batch write below.
     */
    const db = adapter.getFirestoreInstance?.()

    /**
     * Query the `nxf_messages` collection for all messages where:
     * - `conversation_id` matches the conversation we want to mark as read
     * - `recipient_id` matches the current user's ID (their messages only —
     *   we must not mark other users' messages as read)
     * - `is_read` is false (unread messages only — no need to update
     *   messages that are already marked as read)
     */
    const snapshot = await db
      .collection('nxf_messages')
      .where('conversation_id', '==', conversation_id)
      .where('recipient_id',    '==', uid)
      .where('is_read',         '==', false)
      .get()

    console.log(`[messages/mark-read] Found ${snapshot?.size ?? 0} unread messages in conversation`)

    // -----------------------------------------------------------------------
    // Step 5: Batch update all matched messages to is_read: true
    // -----------------------------------------------------------------------

    /**
     * Create a Firestore batch write.
     *
     * A batch allows us to group multiple document updates into one atomic
     * operation — either all succeed or all fail together. This prevents
     * partial updates where only some messages in the conversation get
     * marked as read.
     *
     * For each unread message document we add an update to the batch:
     * - `is_read: true`    — marks the message as read
     * - `updated_at`       — records the exact time the status changed
     */
    const batch = db.batch()

    snapshot?.docs.forEach((doc: any) => {
      batch.update(doc.ref, {
        is_read:    true,
        updated_at: new Date().toISOString(),
      })
    })

    // -----------------------------------------------------------------------
    // Step 6: Commit the batch and return success
    // -----------------------------------------------------------------------

    /**
     * Commit sends all the queued batch operations to Firestore at once.
     * After this resolves, all matched messages in the conversation are
     * marked as read for the current user.
     */
    await batch.commit()

    console.log('[messages/mark-read] Conversation messages marked as read')
    return NextResponse.json({ success: true })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message server-side — never the full error object,
     * which could contain stack traces or internal implementation details.
     * Returns the error message to the client for basic debugging context.
     */
    console.error('[messages/mark-read] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}