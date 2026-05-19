/**
 * GET /api/messages/thread
 *
 * A Next.js server-only API route that fetches all messages within a
 * specific conversation thread, ordered chronologically (oldest first).
 *
 * This file uses 'server-only' at the top, which means Next.js will throw
 * a build error if this file is ever accidentally imported on the client side.
 * This is a safety measure to ensure sensitive logic (auth, database access)
 * never leaks to the browser.
 *
 * Request:
 * - Method:      GET
 * - Headers:     Authorization: Bearer <token>
 * - Query param: conversation_id (required)
 *
 * Example request URL:
 *   /api/messages/thread?conversation_id=abc123
 *
 * Response (success):
 * - 200 { messages: Message[] }
 *   An array of all messages in the conversation, sorted by `sent_at`
 *   ascending (oldest message first — standard chat thread order).
 *
 * Response (error):
 * - 400 { error: 'conversation_id is required' } — Missing query param.
 * - 401 { error: 'Unauthorized' }                — No token provided.
 * - 401 { error: 'Invalid token' }               — Token could not be validated.
 * - 500 { error: string }                        — Unexpected server error.
 *
 * How it works (step by step):
 * 1. Reads `conversation_id` from the URL query parameters.
 *    Returns 400 if it is missing.
 * 2. Extracts the Bearer token from the Authorization header.
 * 3. Validates the token to confirm the user is authenticated.
 * 4. Queries the `nxf_messages` Firestore collection for all messages
 *    where `conversation_id` matches the requested value.
 * 5. Orders results by `sent_at` ascending so the thread reads top-to-bottom
 *    in chronological order (as expected in a chat UI).
 * 6. Returns the full messages array.
 *
 * Note on pagination:
 * - This route currently returns ALL messages in the thread with no limit.
 *   For very long conversations this could become slow — consider adding
 *   cursor-based pagination (startAfter) if thread length becomes an issue.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * GET handler
 *
 * Fetches all messages in a conversation thread for the authenticated user,
 * ordered by `sent_at` ascending (oldest first).
 *
 * @param req - The incoming Next.js server request object.
 * @returns    A NextResponse containing the messages array or an error object.
 */
export async function GET(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Extract and validate the query parameter
    // -----------------------------------------------------------------------

    /**
     * Parse the URL to access query parameters.
     * `conversation_id` is required — it tells us which conversation
     * thread to load messages for.
     */
    const { searchParams } = new URL(req.url)
    const conversation_id  = searchParams.get('conversation_id')

    if (!conversation_id) {
      // Missing required query param — return 400 Bad Request
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
     * We validate the session token to confirm the user is authenticated.
     * The uid is extracted but not used in the query itself — it serves
     * as proof that the requester is a valid authenticated user before
     * we return any message data.
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

    console.log('[messages/thread] Fetching messages for conversation')

    // -----------------------------------------------------------------------
    // Step 4: Query the messages for this conversation thread
    // -----------------------------------------------------------------------

    /**
     * Query the `nxf_messages` Firestore collection for all messages
     * belonging to the requested conversation, ordered chronologically.
     *
     * - `where('conversation_id', '==', conversation_id)` — scopes results
     *   to this specific conversation only.
     * - `orderBy('sent_at', 'asc')` — oldest message first, matching the
     *   natural top-to-bottom reading order of a chat thread.
     *
     * No `.limit()` is applied here — all messages in the thread are returned.
     * See the note on pagination in the file-level comment above.
     */
    const snapshot = await adapter.getFirestoreInstance?.()
      .collection('nxf_messages')
      .where('conversation_id', '==', conversation_id)
      .orderBy('sent_at', 'asc')
      .get()

    /**
     * Map each Firestore document into a plain object.
     * We use `doc.id` as `mes_id` since the document ID is set to the
     * message's UUID when it is created in /api/messages/send.
     * Falls back to an empty array if the snapshot is undefined.
     */
    const messages = snapshot?.docs.map((doc: any) => ({
      mes_id: doc.id,
      ...doc.data(),
    })) ?? []

    console.log(`[messages/thread] Returning ${messages.length} messages`)

    // -----------------------------------------------------------------------
    // Step 5: Return the messages array
    // -----------------------------------------------------------------------

    return NextResponse.json({ messages })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message server-side — never the full error object,
     * which could contain stack traces or internal implementation details.
     * Returns the error message to the client for basic debugging context.
     */
    console.error('[messages/thread] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}