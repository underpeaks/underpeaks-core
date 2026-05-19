/**
 * POST /api/settings/api-keys/generate
 *
 * A server-only Next.js Route Handler that generates a new API key for the
 * authenticated user's project and stores it securely in the database.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Why "server-only"?
 * The `import 'server-only'` at the top is a Next.js guard that causes a build
 * error if this file is ever accidentally imported into client-side code. This
 * is critical here because the file deals with encryption and raw API keys that
 * must NEVER be exposed to the browser bundle.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request shape (POST body — JSON):
 * {
 *   name: string   // A human-readable label for the key (e.g. "Production App")
 * }
 *
 * The request must also include an "Authorization: Bearer <token>" header.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Response shape (JSON):
 *
 * Success (200):
 * {
 *   success:  true,
 *   api_id:   string,   // UUID that uniquely identifies this key record
 *   name:     string,   // The trimmed key name as stored
 *   prefix:   string,   // First 16 characters of the raw key (safe to display)
 * }
 *
 * Note: The full raw key is NOT returned here. The client must call the
 * separate /api/settings/api-keys/reveal endpoint to retrieve it once.
 * This limits how long the plaintext key is in transit.
 *
 * Failure (400 / 401 / 404 / 500):
 * { error: "<reason string>" }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * What happens inside (step by step):
 *
 * 1. Parse and validate the key name from the request body.
 * 2. Extract and verify the Bearer token from the Authorization header.
 * 3. Decode the token via the storage adapter to get the user's UID.
 * 4. Look up the user's project using their UID.
 * 5. Generate a cryptographically random API key in the format:
 *      nxt_live_<32 random hex characters>
 * 6. Encrypt the raw key for safe storage (we never store plaintext keys).
 * 7. Save the key record to the nxf_system_apis table in the database.
 * 8. Return the key's metadata (id, name, prefix) — NOT the raw key.
 */

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'
import { encryptApiKey }             from '@/app/lib/apiKeyEncryption'
import { v4 as uuidv4 }              from 'uuid'
import crypto                        from 'crypto'

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {

    // -----------------------------------------------------------------------
    // 1. Parse and validate the key name
    // -----------------------------------------------------------------------

    /**
     * We expect a JSON body with a `name` field — a short, human-readable
     * label the user gives to this key (e.g. "Mobile App", "CI Pipeline").
     * We reject empty or whitespace-only names immediately with a 400.
     */
    const { name } = await req.json()
    if (!name?.trim())
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 })

    // -----------------------------------------------------------------------
    // 2. Extract the Bearer token from the Authorization header
    // -----------------------------------------------------------------------

    /**
     * The caller must supply a valid session token in the Authorization header.
     * Format: "Authorization: Bearer <token>"
     *
     * We strip the "Bearer " prefix to get the raw token string.
     * If the header is missing entirely, we return 401 Unauthorized.
     */
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null
    if (!token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // -----------------------------------------------------------------------
    // 3. Validate the token and resolve the user's UID
    // -----------------------------------------------------------------------

    /**
     * getStorageAdapter() returns a database-agnostic adapter object.
     * We use it to validate the session token without needing to know whether
     * the project uses Firebase, Supabase, MySQL, etc.
     *
     * `decoded` may look different depending on the adapter:
     *  - Firebase:  { uid: '...', email: '...' }
     *  - Supabase:  { user_id: '...', ... }
     * We handle both shapes by checking `uid` first, then falling back to
     * `user_id`. If neither exists, the token is invalid → return 401.
     */
    const adapter = getStorageAdapter()
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)
    const uid     = decoded?.uid ?? decoded?.user_id ?? null
    if (!uid)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

    // -----------------------------------------------------------------------
    // 4. Look up the user's project
    // -----------------------------------------------------------------------

    /**
     * Each user is the owner of exactly one project in the system.
     * We look it up by their UID so we can associate the new API key with the
     * correct project_id in the database.
     *
     * Like the UID above, the project ID field name can vary by adapter,
     * so we check both `id` and `project_id` before giving up.
     */
    const project    = await adapter.findProjectByOwnerId?.(adapter.config, uid)
    const project_id = project?.id ?? project?.project_id ?? null
    if (!project_id)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    // -----------------------------------------------------------------------
    // 5. Generate a cryptographically secure API key
    // -----------------------------------------------------------------------

    /**
     * `crypto.randomBytes(16)` generates 16 bytes of cryptographically secure
     * random data. Converting to hex gives us a 32-character string.
     * We prepend 'nxt_live_' so keys are instantly recognisable and can be
     * validated by format before even hitting the database.
     *
     * Example output: nxt_live_3a9f2c1b4e8d7f0a6b5c2e1d9f4a8b3c
     *
     * The prefix is the first 16 characters of the raw key. It is safe to
     * store and display in the UI (e.g. "nxt_live_3a9f2c1b...") because it
     * gives just enough to identify which key is which without exposing it.
     */
    const rawKey = `nxt_live_${crypto.randomBytes(16).toString('hex')}`
    const prefix = rawKey.slice(0, 16)

    // -----------------------------------------------------------------------
    // 6. Encrypt the raw key for storage
    // -----------------------------------------------------------------------

    /**
     * We NEVER store API keys in plaintext. `encryptApiKey` uses symmetric
     * encryption (typically AES-256) with a server-side secret to produce a
     * ciphertext that can only be decrypted by the server.
     *
     * This means even if the database is compromised, the keys cannot be used
     * without also having the encryption secret.
     */
    const keyEncrypted = encryptApiKey(rawKey)

    // -----------------------------------------------------------------------
    // 7. Persist the key record to the database
    // -----------------------------------------------------------------------

    /**
     * We generate a UUID for the api_id — a stable, unique identifier for
     * this key record that the client uses to reference it (e.g. for revoking).
     *
     * The record is written to the nxf_system_apis table with:
     * - key_encrypted: the ciphertext (never returned to the client directly)
     * - key_prefix:    the first 16 chars of the raw key (safe to display)
     * - status:        'active' — the key is usable immediately on creation
     * - revoked_at:    null — not revoked yet
     * - last_used_at:  null — hasn't been used yet
     */
    const api_id = uuidv4()
    const now    = new Date().toISOString()

    await adapter.create!(adapter.config, 'nxf_system_apis', {
      api_id,
      project_id,
      name:          name.trim(),
      key_encrypted: keyEncrypted,
      key_prefix:    prefix,
      status:        'active',
      last_used_at:  null,
      revoked_at:    null,
      created_at:    now,
      updated_at:    now,
    })

    // -----------------------------------------------------------------------
    // 8. Return the key metadata (NOT the raw key)
    // -----------------------------------------------------------------------

    /**
     * We intentionally omit `rawKey` from this response.
     * The client will call the /reveal endpoint separately to retrieve the
     * plaintext key exactly once (typically shown in a one-time modal).
     * This limits the window during which the raw key is in transit.
     */
    return NextResponse.json({
      success: true,
      api_id,
      name:   name.trim(),
      prefix,
    })

  } catch (err: any) {
    console.error('[api-keys/generate] Unhandled error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}