// app/api/messages/delete/route.ts

import 'server-only'

/**
 * DELETE /api/messages/delete
 *
 * Next.js App Router API route that permanently deletes a conversation and
 * all of its messages from the database in a single atomic batch operation.
 *
 * Why a batch operation?
 * ──────────────────────
 * A conversation and its messages are stored in two separate Firestore
 * collections (nxf_conversations and nxf_messages). Deleting them in a
 * Firestore batch ensures that either both deletions succeed or neither does
 * — the database is never left in a state where a conversation record exists
 * without its messages or vice versa.
 *
 * Authentication:
 * ────────────────
 * This route requires a valid session token supplied as a Bearer token in the
 * Authorization header. The token is validated against the storage adapter's
 * built-in session validator, which decodes it and returns the user's UID.
 * The UID confirms the caller is an authenticated user — future iterations
 * of this route may also check that the caller owns the conversation.
 *
 * Current database support:
 * ──────────────────────────
 * This route currently uses Firestore via the storage adapter's
 * getFirestoreInstance() method. It is therefore only fully functional when
 * the storage adapter is backed by Firebase/Firestore. Support for other
 * adapters (Supabase, MongoDB, etc.) would require additional branches or
 * a more abstract deletion method on the adapter interface.
 *
 * Request body (JSON):
 * ────────────────────
 *   conversation_id {string} — The Firestore document ID of the conversation
 *                              to delete. All nxf_messages documents with a
 *                              matching conversation_id are also deleted.
 *                              Required.
 *
 * Request headers:
 * ────────────────
 *   Authorization: Bearer <token> — A valid session token. Required.
 *
 * Responses:
 * ──────────
 *   200 { success: true }        — Conversation and all messages deleted.
 *   400 { error: string }        — conversation_id missing from body.
 *   401 { error: string }        — No token provided or token invalid.
 *   500 { error: string }        — Unexpected server error (e.g. Firestore
 *                                  batch failure or adapter error).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

/**
 * DELETE
 *
 * Handles DELETE requests to /api/messages/delete.
 * Authenticates the caller, then deletes the specified conversation and all
 * of its messages in a single Firestore batch.
 *
 * @param req — The incoming Next.js API request containing the JSON body
 *              and Authorization header.
 * @returns A NextResponse JSON object indicating success or failure.
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  /**
   * t — Server-side translation function scoped to the 'messagesDeleteRoute'
   * namespace. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
 // const t = await getTranslations('messagesDeleteRoute')

  try {
    // -----------------------------------------------------------------------
    // Parse and validate request body
    // -----------------------------------------------------------------------

    /**
     * conversation_id identifies which conversation (and its messages) to
     * delete. Without it we have no way to scope the deletion query.
     */
    const { conversation_id } = await req.json()

    if (!conversation_id) {
      return NextResponse.json(
        { error: ('errors.conversationIdRequired') },
        { status: 400 },
      )
    }

    // -----------------------------------------------------------------------
    // Authenticate the caller
    // -----------------------------------------------------------------------

    /**
     * Extract the Bearer token from the Authorization header.
     * The token is stripped of the 'Bearer ' prefix before validation.
     */
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    if (!token) {
      return NextResponse.json(
        { error: ('errors.unauthorized') },
        { status: 401 },
      )
    }

    // -----------------------------------------------------------------------
    // Resolve storage adapter and validate session
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns the configured storage adapter instance.
     * validateBuiltInSession() decodes the token and returns the user's
     * identity payload — we extract the UID from whichever field the adapter
     * returns (uid for Firebase, user_id for custom adapters).
     */
    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null

    /**
     * If the token could not be decoded or the UID is missing, the caller is
     * not authenticated. Return 401 rather than 403 because the issue is with
     * the token itself, not the caller's permissions on a valid session.
     */
    if (!uid) {
      return NextResponse.json(
        { error: ('errors.invalidToken') },
        { status: 401 },
      )
    }

    // -----------------------------------------------------------------------
    // Get Firestore instance
    // -----------------------------------------------------------------------

    /**
     * Retrieve the Firestore database instance from the adapter.
     * This is currently the only supported database for this route.
     * See the file-level JSDoc for notes on extending to other adapters.
     */
    const db = adapter.getFirestoreInstance?.()

    // -----------------------------------------------------------------------
    // Build and commit the batch deletion
    // -----------------------------------------------------------------------

    /**
     * Step 1 — Query all messages belonging to this conversation.
     * nxf_messages documents are linked to their conversation via the
     * conversation_id field, so a simple equality filter fetches them all.
     */
    const msgSnap = await db
      .collection('nxf_messages')
      .where('conversation_id', '==', conversation_id)
      .get()

    /**
     * Step 2 — Add all message deletions and the conversation deletion to a
     * single Firestore batch. Batches are atomic — if any deletion fails,
     * none of them are committed, preventing partial data loss.
     */
    const batch = db.batch()

    /**
     * Queue a delete operation for each message document found in the query.
     * doc.ref is the Firestore DocumentReference needed by batch.delete().
     */
    msgSnap?.docs.forEach((doc: any) => batch.delete(doc.ref))

    /**
     * Queue the deletion of the conversation document itself.
     * This runs after all message deletions in the same atomic batch.
     */
    batch.delete(db.collection('nxf_conversations').doc(conversation_id))

    /**
     * Step 3 — Commit the batch. All queued deletions are sent to Firestore
     * as a single atomic operation. If this throws, the catch block handles
     * the error and returns a 500.
     */
    await batch.commit()

    return NextResponse.json({ success: true })

  } catch (err: any) {
    /**
     * Catch-all for unexpected errors — Firestore connection failures, batch
     * commit errors, adapter initialisation failures, or token validation
     * errors thrown by the adapter. The raw error message is returned so the
     * client has actionable context about the failure.
     */
    console.error(('logs.deleteError'), err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}