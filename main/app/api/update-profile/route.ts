import 'server-only'

/**
 * API Route: POST /api/settings/update-profile
 *
 * A server-side endpoint that updates the full name on the authenticated
 * user's profile record in the nxf_users table/collection.
 *
 * What this route does:
 * 1. Reads full_name from the JSON request body and validates it is not
 *    empty or whitespace-only.
 * 2. Extracts and validates the Bearer token from the Authorization header
 *    to identify the currently logged-in user.
 * 3. Decodes the token to retrieve the user's unique ID (uid).
 * 4. Updates the full_name and updated_at fields on the user's record
 *    in the nxf_users table/collection.
 * 5. Returns { success: true } on completion.
 *
 * Authentication: Required (Bearer token in Authorization header)
 * Method:         POST
 * Body:           { full_name: string }
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures auth tokens and user data are never handled in the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter '

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Updates the full name on the authenticated user's profile.
 * See the file-level JSDoc above for the full step-by-step description.
 *
 * @param req - The incoming Next.js server request. Must include a Bearer
 *              token in the Authorization header and a JSON body containing
 *              { full_name: string }.
 * @returns A NextResponse containing { success: true } on success,
 *          or { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Parse and validate request body ───────────────────────────────────

    /**
     * Extract full_name from the JSON request body.
     * This is the only field this endpoint accepts — it updates the user's
     * display name as shown throughout the application.
     */
    const { full_name } = await req.json()

    /**
     * Validate that full_name is present and not just whitespace.
     * A name consisting only of spaces is not meaningful, so we treat it
     * the same as an empty value and reject it with 400 Bad Request.
     */
    if (!full_name?.trim())
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )

    // ── Resolve user from token ────────────────────────────────────────────

    /**
     * Extract the Bearer token from the Authorization header.
     * The header is expected to look like: "Authorization: Bearer <token>"
     * We strip the "Bearer " prefix to get the raw token string.
     * If the header is missing entirely, token will be null.
     */
    const authHeader = req.headers.get('Authorization')
    const token      = authHeader?.replace('Bearer ', '') ?? null

    /**
     * If no token was provided, the request is unauthenticated.
     * Return 401 Unauthorized — the client must log in first.
     */
    if (!token)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )

    /**
     * getStorageAdapter — Returns the correct database adapter based on the
     * project's configuration (e.g. Firebase, Supabase, custom SQL, etc.).
     * All database operations go through this adapter so the route works
     * regardless of which backend the project is using.
     */
    const adapter = getConfiguredAdapter()

    /**
     * Validate the token against the adapter's built-in session system.
     * On success, decoded contains the token payload including the user's
     * unique ID. On failure (expired, tampered, unknown), decoded will be
     * null or undefined.
     */
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)

    /**
     * Extract the user's unique ID from the decoded token payload.
     * We check both uid and user_id because different adapters use
     * different field names for the same concept.
     */
    const uid = decoded?.uid ?? decoded?.user_id ?? null

    /**
     * If we could not extract a valid user ID, the token is invalid or
     * expired. Return 401 Unauthorized.
     */
    if (!uid)
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )

    // ── Update nxf_users ───────────────────────────────────────────────────

    /**
     * Write the updated full_name and a new updated_at timestamp to the
     * user's record in the nxf_users table/collection.
     *
     * We call .trim() again on full_name here to ensure any surrounding
     * whitespace is stripped from the stored value, even if the earlier
     * validation check somehow passed with leading/trailing spaces.
     *
     * The `!` after adapter.update asserts the method exists on the adapter.
     * If it does not, this will throw and be caught by the outer try/catch.
     */
    await adapter.update!(adapter.config, 'nxf_users', uid, {
      full_name:  full_name.trim(),
      updated_at: new Date().toISOString(),
    })

    /**
     * The update completed successfully.
     * Return a simple success response — the client can use this to
     * show a confirmation message and refresh the displayed profile name.
     */
    return NextResponse.json({ success: true })

  } catch {
    /**
     * Catch-all for any unexpected errors (database down, adapter
     * misconfiguration, JSON parse error, token validation crash, etc.).
     *
     * We return a generic 500 without echoing back the raw error object
     * or its message — leaking stack traces, internal field names, or
     * database details is a security risk.
     */
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}