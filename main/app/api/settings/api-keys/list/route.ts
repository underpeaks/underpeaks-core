/**
 * GET /api/settings/api-keys/list
 *
 * A server-only Next.js Route Handler that retrieves all active API keys
 * belonging to the authenticated user's project.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` guard causes a build-time error if this file is
 * ever accidentally imported into client-side code. This is important here
 * because the handler has access to the database and the storage adapter's
 * internal config — neither of which should ever reach the browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape:
 * GET request with no body.
 * Must include an "Authorization: Bearer <token>" header.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * {
 *   keys: [
 *     {
 *       api_id:       string,        // Unique identifier for the key record
 *       name:         string,        // Human-readable label given by the user
 *       key_prefix:   string,        // First 16 chars of the raw key (safe to show)
 *       status:       string,        // Always 'active' (revoked keys are excluded)
 *       last_used_at: string | null, // ISO timestamp of last use, or null if unused
 *       created_at:   string,        // ISO timestamp of when the key was created
 *     }
 *   ]
 * }
 *
 * Note: `key_encrypted` is intentionally excluded from every record in the
 * response. The encrypted ciphertext must never leave the server.
 *
 * If the user has no project yet, an empty keys array is returned (not an error).
 *
 * Failure (401 / 500):
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1. Extract and verify the Bearer token from the Authorization header.
 * 2. Decode the token via the storage adapter to resolve the user's UID.
 * 3. Look up the user's project using their UID.
 * 4. Query the nxf_system_apis Firestore collection for all active keys
 *    that belong to this project, ordered newest-first.
 * 5. Strip `key_encrypted` from each record and return the safe fields only.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {

    // -----------------------------------------------------------------------
    // 1. Extract the Bearer token from the Authorization header
    // -----------------------------------------------------------------------

    /**
     * The caller must supply a valid session token in the Authorization header.
     * Format: "Authorization: Bearer <token>"
     *
     * We strip the "Bearer " prefix to get the raw token string.
     * If the header is missing or empty, we return 401 Unauthorized immediately.
     */
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // -----------------------------------------------------------------------
    // 2. Validate the token and resolve the user's UID
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns a database-agnostic adapter that abstracts
     * over Firebase, Supabase, MySQL, etc. We use it to validate the session
     * token without caring which database the project is configured to use.
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
    // 3. Look up the user's project
    // -----------------------------------------------------------------------

    /**
     * Each authenticated user owns exactly one project. We find it by their UID
     * so we know which project_id to filter API keys by in the next step.
     *
     * If no project is found, we return an empty keys array rather than an error.
     * This is intentional — a new user who hasn't set up a project yet shouldn't
     * see a failure screen; they should simply see an empty list.
     */
    const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
    const project_id = project?.id ?? project?.project_id ?? null
    if (!project_id)
      return NextResponse.json({ keys: [] })

    // -----------------------------------------------------------------------
    // 4. Query Firestore for the project's active API keys
    // -----------------------------------------------------------------------

    /**
     * We use Firestore directly here (via `getFirestoreInstance`) rather than
     * going through the adapter's generic CRUD methods, because we need to
     * combine multiple `where` filters with an `orderBy` — something that maps
     * naturally to Firestore's fluent query API.
     *
     * Filters applied:
     * - project_id == project_id  → only this user's project's keys
     * - status == 'active'        → exclude revoked keys
     * - orderBy created_at desc   → newest key appears first in the list
     *
     * Note: Firestore may require a composite index for the combination of
     * `where('status')` + `orderBy('created_at')`. If you see an index error
     * in the logs, follow the Firestore console link it provides to create it.
     */
    const db       = adapter.getFirestoreInstance?.()
    const snapshot = await db
      .collection('nxf_system_apis')
      .where('project_id', '==', project_id)
      .where('status', '==', 'active')
      .orderBy('created_at', 'desc')
      .get()

    // -----------------------------------------------------------------------
    // 5. Shape the response — strip the encrypted key from every record
    // -----------------------------------------------------------------------

    /**
     * For each Firestore document returned, we build a plain object containing
     * only the fields that are safe to send to the client.
     *
     * `key_encrypted` is deliberately excluded. It contains the AES-encrypted
     * ciphertext of the raw API key, and must never leave the server.
     *
     * `doc.id` is the Firestore document ID, which we expose as `api_id` so
     * the client can reference specific keys (e.g. when revoking one).
     *
     * We use `?? []` at the end so that if `snapshot` is somehow undefined
     * (e.g. Firestore returned nothing), we safely return an empty array
     * rather than throwing a runtime error.
     */
    const keys = snapshot?.docs.map((doc: any) => {
      const data = doc.data()
      return {
        api_id:       doc.id,
        name:         data.name,
        key_prefix:   data.key_prefix,
        status:       data.status,
        last_used_at: data.last_used_at ?? null,
        created_at:   data.created_at,
        // key_encrypted intentionally excluded — must never leave the server
      }
    }) ?? []

    return NextResponse.json({ keys })

  } catch (err: any) {
    console.error('[api-keys/list] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}