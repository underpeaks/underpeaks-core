/**
 * POST /api/messages/send
 *
 * A Next.js server-only API route that sends a new message within an
 * existing conversation.
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
 * - Body:    { conversation_id: string, content: string }
 *
 * Response (success):
 * - 200 { success: true, message: Message }
 *   Returns the full message object that was saved to Firestore.
 *
 * Response (error):
 * - 400 { error: 'conversation_id and content are required' } — Missing body fields.
 * - 401 { error: 'Unauthorized' }                            — No token provided.
 * - 401 { error: 'Invalid token' }                           — Token could not be validated.
 * - 500 { error: string }                                    — Unexpected server error.
 *
 * How it works (step by step):
 * 1. Reads `conversation_id` and `content` from the request body.
 *    Returns 400 if either is missing.
 * 2. Extracts and validates the Bearer token from the Authorization header.
 * 3. Validates the token to confirm the user is authenticated and gets their ID.
 * 4. Generates a unique message ID using UUID v4.
 * 5. Builds the message document and writes it to the `nxf_messages` collection.
 * 6. Updates the parent conversation document with a preview of the message
 *    and the current timestamp so conversations can be sorted by latest activity.
 * 7. Returns the full saved message object.
 *
 * Note on recipient_id:
 * - `recipient_id` is set to null here because at the point of sending,
 *   the server does not know which specific user will receive the message.
 *   The recipient is typically resolved downstream (e.g. by a Cloud Function
 *   or a separate process that fans the message out to participants).
 *
 * Note on last_message_preview:
 * - Only the first 100 characters of the message content are stored as
 *   the preview to keep the conversation document lightweight, since
 *   the preview is shown in conversation list UIs (not the full content).
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'
import { v4 as uuidv4 }             from 'uuid'

/**
 * POST handler
 *
 * Creates a new message document in Firestore and updates the parent
 * conversation with the latest message preview and timestamp.
 *
 * @param req - The incoming Next.js server request object.
 * @returns    A NextResponse with { success: true, message } or an error object.
 */
export async function POST(req: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Parse and validate the request body
    // -----------------------------------------------------------------------

    /**
     * Extract `conversation_id` and `content` from the JSON request body.
     * Both fields are required:
     * - `conversation_id` — identifies which conversation to post to.
     * - `content`         — the text body of the message being sent.
     */
    const { conversation_id, content } = await req.json()

    if (!conversation_id || !content) {
      return NextResponse.json(
        { error: 'conversation_id and content are required' },
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
     * and to get their user ID, which becomes the `sender_id` on the message.
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

    // -----------------------------------------------------------------------
    // Step 4: Prepare the message document
    // -----------------------------------------------------------------------

    /**
     * Get the Firestore database instance from the adapter.
     * Reused for both the message write and the conversation update below.
     */
    const db = adapter.getFirestoreInstance?.()

    /**
     * Generate a single shared timestamp for all date fields on this message.
     * Using one value ensures `sent_at`, `created_at`, and `updated_at` are
     * identical on creation — avoiding any tiny discrepancies from calling
     * new Date() multiple times.
     */
    const now = new Date().toISOString()

    /**
     * Generate a unique ID for this message using UUID v4.
     * We generate it here (rather than letting Firestore auto-generate one)
     * so we can use the same ID as both the Firestore document ID and the
     * `mes_id` field inside the document, making lookups straightforward.
     */
    const mes_id = uuidv4()

    /**
     * Build the full message document to be saved to Firestore.
     *
     * Fields:
     * - mes_id          — The unique message ID (same as the document ID).
     * - conversation_id — The conversation this message belongs to.
     * - sender_id       — The authenticated user who is sending this message.
     * - recipient_id    — Null at send time; resolved downstream per the note above.
     * - content         — The full text body of the message.
     * - is_read         — Always false on creation; updated when recipient reads it.
     * - sent_at         — When the message was sent (same as created_at on creation).
     * - created_at      — When the document was created in Firestore.
     * - updated_at      — Last time the document was modified (starts equal to created_at).
     */
    const message = {
      mes_id,
      conversation_id,
      sender_id:    uid,
      recipient_id: null,
      content,
      is_read:      false,
      sent_at:      now,
      created_at:   now,
      updated_at:   now,
    }

    console.log('[messages/send] Saving new message to Firestore')

    // -----------------------------------------------------------------------
    // Step 5: Write the message to Firestore
    // -----------------------------------------------------------------------

    /**
     * Write the message document to the `nxf_messages` collection.
     * We use `.doc(mes_id).set(message)` rather than `.add(message)` so
     * that the Firestore document ID matches our generated `mes_id`.
     */
    await db.collection('nxf_messages').doc(mes_id).set(message)

    // -----------------------------------------------------------------------
    // Step 6: Update the parent conversation
    // -----------------------------------------------------------------------

    /**
     * Update the conversation document to reflect this new message.
     *
     * We update three fields:
     * - `last_message_preview` — A truncated version of the message content
     *   (max 100 characters) shown in conversation list UIs. We slice rather
     *   than store the full content to keep the conversation document small.
     * - `last_message_at`      — The timestamp of the most recent message,
     *   used to sort conversations by latest activity.
     * - `updated_at`           — Records when the conversation was last modified.
     */
    await db.collection('nxf_conversations').doc(conversation_id).update({
      last_message_preview: content.slice(0, 100),
      last_message_at:      now,
      updated_at:           now,
    })

    console.log('[messages/send] Message sent and conversation updated successfully')

    // -----------------------------------------------------------------------
    // Step 7: Return the saved message
    // -----------------------------------------------------------------------

    /**
     * Return the full message object so the client can immediately display
     * the new message in the UI without needing to re-fetch the conversation.
     */
    return NextResponse.json({ success: true, message })

  } catch (err: any) {
    /**
     * Catch-all error handler.
     * Logs only the error message server-side — never the full error object,
     * which could contain stack traces or internal implementation details.
     * Returns the error message to the client for basic debugging context.
     */
    console.error('[messages/send] Unexpected error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}