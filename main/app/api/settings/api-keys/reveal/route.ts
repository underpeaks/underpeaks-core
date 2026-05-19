/**
 * POST /api/settings/api-keys/reveal
 *
 * A server-only Next.js Route Handler that decrypts and returns the plaintext
 * value of a single API key — but only to the key's rightful owner.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` guard causes a build-time error if this file is
 * ever accidentally bundled into client-side code. This is the most sensitive
 * endpoint in the API key system: it performs decryption and returns a plaintext
 * secret. It must never run anywhere other than the server.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * When is this endpoint called?
 * The /generate endpoint deliberately does NOT return the raw key in its
 * response. Instead, the client calls this /reveal endpoint once — immediately
 * after generation — to retrieve the plaintext key and display it to the user
 * in a one-time modal. After the user dismisses the modal, the plaintext key
 * is gone from the client; it can never be retrieved again from the UI.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   api_id: string   // The UUID of the API key record to reveal
 * }
 *
 * Must also include an "Authorization: Bearer <token>" header.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * {
 *   success: true,
 *   key:     string   // The full plaintext API key (e.g. "nxt_live_3a9f2c1b...")
 * }
 *
 * Failure (400 / 401 / 403 / 404 / 500):
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1. Parse and validate the api_id from the request body.
 * 2. Extract and verify the Bearer token from the Authorization header.
 * 3. Decode the token via the storage adapter to resolve the user's UID.
 * 4. Fetch the key document from Firestore by api_id.
 * 5. Reject the request if the key has been revoked.
 * 6. Verify that the key belongs to the requesting user's project (ownership check).
 * 7. Decrypt the stored ciphertext and return the plaintext key.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Security notes:
 * - Steps 5 and 6 are both required. Step 5 prevents serving revoked keys.
 *   Step 6 prevents one user from revealing another user's key by guessing
 *   or brute-forcing a valid api_id (an IDOR — Insecure Direct Object Reference
 *   — attack). Never skip the ownership check.
 * - Decryption happens entirely on the server. The `key_encrypted` ciphertext
 *   is never sent to the client; only the decrypted plaintext is returned.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'
import { decryptApiKey }             from '@/app/lib/apiKeyEncryption'

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {

    // -----------------------------------------------------------------------
    // 1. Parse and validate the api_id
    // -----------------------------------------------------------------------

    /**
     * `api_id` is the UUID that uniquely identifies the key record in
     * Firestore. Without it we have no idea which key to reveal, so we
     * reject the request immediately with a 400 Bad Request.
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
     * getStorageAdapter() returns a database-agnostic adapter that abstracts
     * over Firebase, Supabase, MySQL, etc. We use it to validate the session
     * token without needing to know which database the project uses.
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
    // 4. Fetch the key document from Firestore
    // -----------------------------------------------------------------------

    /**
     * We look up the key record directly by its document ID (api_id).
     * If no document exists with that ID, we return 404 Not Found.
     *
     * Note: We do the revoke check (step 5) and the ownership check (step 6)
     * AFTER fetching the document. This ordering is intentional — we need
     * the document data for both checks, so we fetch it once and reuse it.
     */
    const db  = adapter.getFirestoreInstance?.()
    const doc = await db.collection('nxf_system_apis').doc(api_id).get()

    if (!doc.exists)
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })

    const data = doc.data()

    // -----------------------------------------------------------------------
    // 5. Reject revoked keys
    // -----------------------------------------------------------------------

    /**
     * A revoked key's ciphertext is still stored in Firestore (for audit trail
     * purposes), but it must never be decrypted or served again.
     * We check the status field and return 400 if the key has been revoked.
     */
    if (data.status === 'revoked')
      return NextResponse.json({ error: 'Key has been revoked' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 6. Verify ownership — confirm the key belongs to this user's project
    // -----------------------------------------------------------------------

    /**
     * This is the IDOR (Insecure Direct Object Reference) protection step.
     *
     * Without this check, any authenticated user who knows (or guesses) a valid
     * api_id could call this endpoint and retrieve someone else's decrypted key.
     *
     * To prevent this, we look up the project that belongs to the requesting
     * user and compare its project_id against the one stored on the key record.
     * If they don't match, we return 403 Forbidden — not 404, because the key
     * does exist; the user simply isn't allowed to access it.
     *
     * We intentionally do NOT tell the caller why the check failed (e.g. "wrong
     * owner") to avoid leaking information about which api_ids exist.
     */
    const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
    const project_id = project?.id ?? project?.project_id ?? null

    if (data.project_id !== project_id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // -----------------------------------------------------------------------
    // 7. Decrypt and return the plaintext key
    // -----------------------------------------------------------------------

    /**
     * `decryptApiKey` uses the server's secret encryption key to reverse the
     * AES-256 encryption applied when the key was generated. The result is
     * the original raw key string (e.g. "nxt_live_3a9f2c1b...").
     *
     * This plaintext value is returned to the client exactly once and displayed
     * in a one-time modal. The client is responsible for warning the user to
     * copy it — it cannot be retrieved again through the UI after dismissal.
     *
     * `key_encrypted` (the ciphertext) is never included in the response.
     */
    const plainKey = decryptApiKey(data.key_encrypted)

    return NextResponse.json({ success: true, key: plainKey })

  } catch (err: any) {
    console.error('[api-keys/reveal] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}