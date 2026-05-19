import 'server-only'

/**
 * API Route: POST /api/settings/change-password
 *
 * This is a **server-side only** API endpoint that allows an authenticated
 * user to change their own password.
 *
 * What this route does:
 * 1. Validates that both `currentPassword` and `newPassword` are provided
 *    in the request body, and that the new password meets the minimum length.
 * 2. Extracts and validates the Bearer token from the Authorization header
 *    to identify the currently logged-in user.
 * 3. Loads the user record from the database (nxf_users table/collection).
 * 4. Verifies that `currentPassword` matches the stored hashed password
 *    using bcrypt — this prevents someone who found an open session from
 *    changing the password without knowing the current one.
 * 5. Hashes the new password with bcrypt and saves it to nxf_users.
 * 6. If the project is using Firebase as its database, also updates the
 *    password in Firebase Authentication so both systems stay in sync.
 *
 * Authentication: Required (Bearer token in Authorization header)
 * Method:         POST
 * Body:           { currentPassword: string, newPassword: string }
 * Success:        { success: true }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This is a safety measure to ensure passwords and tokens are never handled
 * in the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'
import bcrypt                        from 'bcryptjs'
import admin                         from 'firebase-admin'

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * The main handler for password change requests. See file-level JSDoc above
 * for the full description of what this route does step by step.
 *
 * @param req - The incoming Next.js server request object. Contains the
 *              Authorization header and the JSON body with passwords.
 * @returns A NextResponse with either { success: true } or { error: string }.
 */
export async function POST(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'changePassword' namespace.
   * Unlike client components which use useTranslations(), server-side code must
   * use getTranslations() and await it. This gives us access to all translated
   * strings for error messages and log entries in this route.
   */
 // const t = await getTranslations('changePassword')

  try {
    /**
     * Parse the JSON body sent by the client.
     * We expect exactly two fields:
     *   - currentPassword: the user's existing password (to verify identity)
     *   - newPassword:     the password the user wants to switch to
     */
    const { currentPassword, newPassword } = await req.json()

    // ── Input validation ───────────────────────────────────────────────────

    /**
     * Both fields are required. If either is missing or empty, return a
     * 400 Bad Request immediately — no point going further without both values.
     */
    if (!currentPassword || !newPassword)
      return NextResponse.json(
        { error: ('errors.bothPasswordsRequired') },
        { status: 400 }
      )

    /**
     * Enforce a minimum password length of 8 characters.
     * Short passwords are easier to guess or brute-force, so we reject them
     * before they ever reach the hashing or database layer.
     */
    if (newPassword.length < 8)
      return NextResponse.json(
        { error: ('errors.passwordTooShort') },
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
        { error: ('errors.unauthorized') },
        { status: 401 }
      )

    /**
     * getStorageAdapter — Returns the correct database adapter based on the
     * project's configuration (e.g. Firebase, Supabase, custom SQL, etc.).
     * All database operations go through this adapter so the route works
     * regardless of which backend the project is using.
     */
    const adapter = getStorageAdapter()

    /**
     * Validate the token against the adapter's built-in session system.
     * On success, `decoded` contains the token payload including the user's
     * unique ID (uid or user_id depending on the adapter).
     * On failure (expired, tampered, unknown token), decoded will be null/undefined.
     */
    const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)

    /**
     * Extract the user's unique ID from the decoded token.
     * We check both `uid` and `user_id` because different adapters use
     * different field names for the same concept.
     */
    const uid = decoded?.uid ?? decoded?.user_id ?? null

    /**
     * If we could not extract a valid user ID the token is invalid or expired.
     * Return 401 Unauthorized.
     */
    if (!uid)
      return NextResponse.json(
        { error: ('errors.invalidToken') },
        { status: 401 }
      )

    // ── Get user from nxf_users ────────────────────────────────────────────

    /**
     * Load the full user record from the nxf_users table/collection using
     * the adapter. We need the stored password_hash to verify the current
     * password in the next step.
     */
    const result = await adapter.getUserById?.(uid)

    /**
     * If no user record was found for this UID, something is wrong —
     * the token referenced a user that no longer exists. Return 404.
     */
    if (!result?.user)
      return NextResponse.json(
        { error: ('errors.userNotFound') },
        { status: 404 }
      )

    const user = result.user

    // ── Verify current password ────────────────────────────────────────────

    /**
     * Use bcrypt.compare to check whether the plain-text `currentPassword`
     * matches the hashed value stored in the database.
     *
     * bcrypt automatically extracts the salt from the stored hash and
     * re-hashes the input to compare — we never store or compare plain-text
     * passwords directly.
     *
     * If they do not match, the user has entered the wrong current password.
     * Return 400 — do not allow the change to proceed.
     */
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash)
    if (!passwordMatch)
      return NextResponse.json(
        { error: ('errors.incorrectCurrentPassword') },
        { status: 400 }
      )

    // ── Hash new password ──────────────────────────────────────────────────

    /**
     * Hash the new password before saving it.
     * The second argument (10) is the "salt rounds" — a higher number makes
     * the hash slower to compute, which makes brute-force attacks harder.
     * 10 is the standard recommended value balancing security and performance.
     *
     * We NEVER store plain-text passwords — always hashed.
     */
    const newHash = await bcrypt.hash(newPassword, 10)

    // ── Update nxf_users ───────────────────────────────────────────────────

    /**
     * Save the new password hash and an updated timestamp to the user's
     * record in the nxf_users table/collection.
     * The `!` after adapter.update asserts it is defined — if it were not,
     * this would throw and be caught by the outer try/catch.
     */
    await adapter.update!(adapter.config, 'nxf_users', uid, {
      password_hash: newHash,
      updated_at:    new Date().toISOString(),
    })

    // ── Update Firebase Auth password ──────────────────────────────────────

    /**
     * If the project is using Firebase as its database, we also need to
     * update the password in Firebase Authentication — the Firebase Auth
     * service keeps its own separate copy of the password and will not
     * automatically pick up changes made to nxf_users.
     *
     * We wrap this in its own try/catch so that a Firebase Auth failure
     * does NOT roll back the nxf_users update — the primary record is
     * already correct, so we log a warning and continue.
     */
    const dbType = process.env.NEXT_PUBLIC_DB_TYPE
    if (dbType === 'firebase') {
      try {
        await admin.auth().updateUser(uid, { password: newPassword })
        console.log(('logs.firebasePasswordUpdated'))
      } catch {
        /**
         * Log a warning without including the error object itself —
         * the error may contain internal Firebase details or stack traces
         * that should not be written to logs in production.
         * We do not re-throw because the nxf_users record is already saved.
         */
        console.warn(('logs.firebasePasswordUpdateFailed'))
      }
    }

    /**
     * Everything succeeded — return a simple success response.
     * The client can use this to show a success message to the user.
     */
    return NextResponse.json({ success: true })

  } catch {
    /**
     * Catch-all for any unexpected errors (database down, JSON parse error,
     * adapter misconfiguration, etc.).
     * We return a generic 500 without exposing internal error details —
     * leaking stack traces or internal messages is a security risk.
     */
    return NextResponse.json(
      { error: ('errors.internalError') },
      { status: 500 }
    )
  }
}