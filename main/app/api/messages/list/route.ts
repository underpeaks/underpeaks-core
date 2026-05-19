/**
 * GET /api/messages/list
 *
 * A Next.js server-only API route that fetches the most recent conversations
 * for the currently authenticated user, along with the unread message count
 * for each conversation.
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
 * - 200 { conversations: ConversationWithUnread[] }
 *   Each conversation includes all its Firestore fields plus `unread_count`.
 *
 * Response (error):
 * - 401 { error: 'Unauthorized' }   — No token provided.
 * - 401 { error: 'Invalid token' }  — Token could not be validated.
 * - 500 { error: string }           — Unexpected server error.
 *
 * How it works (step by step):
 * 1. Extracts the Bearer token from the Authorization header.
 * 2. Validates the token using the storage adapter's session validator.
 * 3. Looks up the project owned by the authenticated user.
 * 4. Fetches the 10 most recent conversations for that project from Firestore,
 *    ordered by `last_message_at` descending.
 * 5. For each conversation, counts how many messages are unread for this user.
 * 6. Returns the conversations array with the `unread_count` field added.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * GET handler
 *
 * Fetches the authenticated user's recent conversations with unread counts.
 *
 * @param req - The incoming Next.js server request object.
 * @returns    A NextResponse containing either the conversations array or an error.
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
     * (e.g. Firebase, Supabase, custom). Different adapters expose different
     * methods, so we use optional chaining (?.) throughout.
     */
    const adapter = getStorageAdapter()

    /**
     * Validate the session token using the adapter's built-in session validator.
     * Returns a decoded token object containing the user's ID.
     */
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

    console.log('[messages/list] Fetching conversations for user')

    // -----------------------------------------------------------------------
    // Step 3: Look up the project owned by this user
    // -----------------------------------------------------------------------

    /**
     * Each user has a project associated with their account.
     * We need the project ID to query conversations scoped to that project.
     */
    const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
    const project_id = project?.id ?? project?.project_id ?? null

    if (!project_id) {
      /**
       * If no project is found for this user, return an empty conversations
       * array rather than an error — this is a valid state for new users
       * who haven't set up a project yet.
       */
      console.log('[messages/list] No project found for user — returning empty list')
      return NextResponse.json({ conversations: [] })
    }

    // -----------------------------------------------------------------------
    // Step 4: Fetch the 10 most recent conversations for this project
    // -----------------------------------------------------------------------

    /**
     * Query the `nxf_conversations` Firestore collection for all conversations
     * belonging to this project, ordered by most recently active first.
     * Limited to 10 to keep the response fast and avoid over-fetching.
     */
    const snapshot = await adapter.getFirestoreInstance?.()
      .collection('nxf_conversations')
      .where('project_id', '==', project_id)
      .orderBy('last_message_at', 'desc')
      .limit(10)
      .get()

    /**
     * Map each Firestore document into a plain object.
     * `doc.id` is the Firestore document ID; `doc.data()` contains the fields.
     * Falls back to an empty array if the snapshot is undefined.
     */
    const conversations = snapshot?.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) ?? []

    console.log(`[messages/list] Fetched ${conversations.length} conversations`)

    // -----------------------------------------------------------------------
    // Step 5: Add unread message count to each conversation
    // -----------------------------------------------------------------------

    /**
     * For each conversation, count how many messages:
     * - Belong to that conversation (`conversation_id` matches)
     * - Are addressed to the current user (`recipient_id` matches uid)
     * - Have not been read yet (`is_read` is false)
     *
     * We use Promise.all() to run all these queries in parallel rather than
     * one at a time, which is much faster when there are multiple conversations.
     *
     * `conv.con_id ?? conv.id` handles adapters that use either field name
     * for the conversation's own ID reference.
     */
    const withUnread = await Promise.all(
      conversations.map(async (conv: any) => {
        const unreadSnap = await adapter.getFirestoreInstance?.()
          .collection('nxf_messages')
          .where('conversation_id', '==', conv.con_id ?? conv.id)
          .where('recipient_id',    '==', uid)
          .where('is_read',         '==', false)
          .get()

        return {
          ...conv,
          unread_count: unreadSnap?.size ?? 0,
        }
      })
    )

    // -----------------------------------------------------------------------
    // Step 6: Return the enriched conversations array
    // -----------------------------------------------------------------------

    console.log('[messages/list] Returning conversations with unread counts')
    return NextResponse.json({ conversations: withUnread })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs the full error server-side for debugging, but only returns the
     * error message string to the client — never the full stack trace,
     * which could expose internal implementation details.
     */
    console.error('[messages/list] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}