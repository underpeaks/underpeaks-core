/**
 * POST /api/settings/api-keys/revoke
 *
 * A server-only Next.js Route Handler that permanently revokes an API key
 * by updating its status to 'revoked' in Firestore.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` guard causes a build-time error if this file is
 * ever accidentally bundled into client-side code. Revoking a key is a
 * destructive, irreversible action that must be authenticated and authorised
 * on the server — it must never be triggerable directly from the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What does "revoke" mean?
 * Revoking a key does NOT delete its database record. Instead, the key's
 * `status` field is changed from 'active' to 'revoked', and `revoked_at` is
 * stamped with the current timestamp. This approach:
 * - Preserves an audit trail (you can see when and which keys were revoked).
 * - Allows other parts of the system to reject requests that use a revoked key
 *   by checking the status field before honouring the key.
 * - Makes the action reversible at the database level if ever needed by an admin.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  Security gap — missing ownership check:
 * This endpoint currently fetches the key by api_id and revokes it without
 * verifying that the key belongs to the requesting user's project. This creates
 * an IDOR (Insecure Direct Object Reference) vulnerability: any authenticated
 * user who knows another user's api_id could revoke their key.
 *
 * The fix is the same pattern used in /reveal:
 *   const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
 *   const project_id = project?.id ?? project?.project_id ?? null
 *   if (data.project_id !== project_id)
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
 *
 * This check should be added before the `snapshot.ref.update(...)` call.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   api_id: string   // The UUID of the API key record to revoke
 * }
 *
 * Must also include an "Authorization: Bearer <token>" header.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * { success: true }
 *
 * Failure (400 / 401 / 404 / 500):
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1. Parse and validate the api_id from the request body.
 * 2. Extract and verify the Bearer token from the Authorization header.
 * 3. Decode the token via the storage adapter to resolve the user's UID.
 * 4. Fetch the key document from Firestore by api_id.
 * 5. Reject the request if the key does not exist.
 * 6. Update the key's status to 'revoked' and stamp the revoked_at timestamp.
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
    // 1. Parse and validate the api_id
    // -----------------------------------------------------------------------

    /**
     * `api_id` is the UUID that uniquely identifies the key record to revoke.
     * Without it we cannot locate the correct document, so we reject immediately
     * with a 400 Bad Request.
     */
    const { api_id } = await req.json()
    if (!api_id)
      return NextResponse.json({ error: 'api_id is required' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 2. Extract the Bearer token from the Authorization header
    // -----------------------------------------------------------------------

    /**
     * The caller must supply a valid session token in the Authorization header.
     * Format: "Authorization: Bearer <token>"
     *
     * We strip the "Bearer " prefix to isolate the raw token string.
     * A missing or empty header results in a 401 Unauthorized response.
     */
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // -----------------------------------------------------------------------
    // 3. Validate the token and resolve the user's UID
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns a database-agnostic adapter that works with
     * Firebase, Supabase, MySQL, and other supported databases. We use it to
     * validate the session token without caring about the underlying DB type.
     *
     * The decoded payload shape differs by adapter:
     *  - Firebase:  { uid: '...', email: '...' }
     *  - Supabase:  { user_id: '...', ... }
     * We handle both by checking `uid` first, then falling back to `user_id`.
     * If neither is present, the token is invalid or expired → return 401.
     */
    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null
    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // -----------------------------------------------------------------------
    // 4. Capture the current timestamp
    // -----------------------------------------------------------------------

    /**
     * We generate a single timestamp here and reuse it for both `revoked_at`
     * and `updated_at`. This guarantees both fields are identical rather than
     * differing by a few milliseconds if they were generated separately.
     */
    const now = new Date().toISOString()

    // -----------------------------------------------------------------------
    // 5. Fetch the key document from Firestore
    // -----------------------------------------------------------------------

    /**
     * We look up the key record directly by its Firestore document ID (api_id).
     *
     * ⚠️  TODO — Add ownership check here (see security note at the top of
     * this file). After fetching, compare `snapshot.data().project_id` against
     * the project_id resolved from the requesting user's UID. Return 403 if
     * they do not match.
     */
    const db       = await adapter.getFirestoreInstance?.()
    const snapshot = await db.collection('nxf_system_apis').doc(api_id).get()

    if (!snapshot.exists)
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })

    // -----------------------------------------------------------------------
    // 6. Mark the key as revoked
    // -----------------------------------------------------------------------

    /**
     * We use Firestore's `.update()` method to change only the three fields
     * listed below, leaving all other fields (name, key_encrypted, etc.) intact.
     *
     * Fields updated:
     * - status:     'revoked' — signals to all consumers that this key is invalid.
     * - revoked_at: ISO timestamp — records exactly when the key was revoked.
     * - updated_at: ISO timestamp — keeps the record's last-modified time current.
     *
     * We use `snapshot.ref.update()` rather than re-querying the collection.
     * `snapshot.ref` is a direct reference to the Firestore document, so this
     * avoids an extra database round-trip.
     *
     * After this write completes, any system that checks `status === 'active'`
     * before honouring a key will automatically start rejecting this key.
     */
    await snapshot.ref.update({
      status:     'revoked',
      revoked_at: now,
      updated_at: now,
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[api-keys/revoke] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}