import { NextRequest, NextResponse } from 'next/server';
import { DBAdapter, DBConfig } from '../../db-adapter/types';
import { AuthService } from './auth-service';

/**
 * @file auth-guard.ts
 * @description
 * This file contains the `authGuard` function — a reusable authentication
 * middleware utility for protecting API routes in Next.js.
 *
 * What does an auth guard do?
 * ----------------------------
 * An auth guard sits in front of a protected API route and checks whether
 * the incoming request carries a valid authentication token before allowing
 * the request to proceed. Think of it as a bouncer at a door — if you don't
 * have a valid pass, you don't get in.
 *
 * How does it work?
 * ------------------
 * 1. It reads the Authorization header from the incoming request.
 *    The header is expected to follow the standard Bearer token format:
 *      Authorization: Bearer <your-token-here>
 *
 * 2. It strips the "Bearer " prefix to extract just the raw token string.
 *
 * 3. It passes the token to AuthService.validateAccessToken() which checks:
 *    - That the token exists in the database
 *    - That the token has not expired
 *    - That the token belongs to a real user
 *
 * 4. If valid, it optionally extends the token's expiry (sliding session),
 *    attaches the user object to the request for downstream route handlers
 *    to use, and calls NextResponse.next() to allow the request through.
 *
 * 5. If anything fails (missing token, invalid token, server error), it
 *    returns an appropriate JSON error response and the request is blocked.
 *
 * How do I use this in an API route?
 * ------------------------------------
 * Call authGuard() at the top of your route handler and return early if it
 * does not return a NextResponse.next():
 *
 * @example
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const guard = await authGuard(req, adapter, config);
 *   if (guard.status !== 200) return guard; // blocked — return the error response
 *
 *   const user = (req as any).user; // safe to access — authGuard attached it
 *   return NextResponse.json({ data: 'protected data', user });
 * }
 * ```
 *
 * ⚠️  Security rules for this file:
 *   - Never log the raw token value — it is a security credential
 *   - Never log user passwords or sensitive user fields
 *   - Only log sanitised, non-sensitive error context (e.g. error message only)
 */

/**
 * @function authGuard
 * @description
 * Validates the Bearer token on an incoming API request and either allows
 * the request to proceed or returns a JSON error response blocking it.
 *
 * @param {NextRequest} req
 *   The incoming Next.js API request. Must contain an Authorization header
 *   in the format: "Bearer <token>".
 *   If validation passes, the authenticated user object is attached to
 *   req.user for use by the downstream route handler.
 *
 * @param {DBAdapter} adapter
 *   The database adapter instance for the project's configured database
 *   (e.g. PostgreSQL, MySQL, MongoDB). Passed to AuthService so it can
 *   query the correct database when validating the token.
 *
 * @param {DBConfig} config
 *   The configuration object for the database adapter (connection strings,
 *   credentials, etc.). Also passed through to AuthService.
 *
 * @returns {Promise<NextResponse>}
 *   - NextResponse.next()         — token is valid, request is allowed through
 *   - 401 JSON response           — token is missing or invalid/expired
 *   - 500 JSON response           — an unexpected server error occurred
 */
export async function authGuard(req: NextRequest, adapter: DBAdapter, config: DBConfig) {
  try {
    /**
     * Instantiate the AuthService with the provided database adapter and config.
     * AuthService contains all the logic for validating tokens, extending sessions,
     * and looking up users — authGuard just orchestrates the flow.
     */
    const authService = new AuthService(adapter, config);

    /**
     * Read the Authorization header from the incoming request.
     * We fall back to an empty string if the header is not present so that
     * the .replace() call below doesn't throw on a null value.
     *
     * Expected format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     * ⚠️ Never log this value — it contains the raw authentication token.
     */
    const authHeader = req.headers.get('Authorization') || '';

    /**
     * Strip the "Bearer " prefix (case-insensitive) to get just the token string.
     * The regex /^Bearer\s+/i matches "Bearer " at the start of the string,
     * including any amount of whitespace between "Bearer" and the token.
     * ⚠️ Never log the resulting token value.
     */
    const token = authHeader.replace(/^Bearer\s+/i, '');

    /**
     * If no token was found (the header was missing or contained only "Bearer "),
     * return a 401 Unauthorized response immediately.
     * The request is blocked and the route handler never runs.
     */
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    /**
     * Ask AuthService to validate the token.
     * This checks that:
     *   - The token exists in the database
     *   - The token has not passed its expiry date/time
     *   - The token is associated with a valid user account
     *
     * Returns the user object if valid, or null if invalid/expired.
     * ⚠️ Never log the token being passed in here.
     */
    const user = await authService.validateAccessToken(token);

    /**
     * If validateAccessToken returned null, the token is either invalid
     * (e.g. tampered with) or expired. Block the request with a 401.
     */
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    /**
     * Optionally extend the token's expiry time (sliding session).
     *
     * What is a sliding session?
     * A sliding session resets the token's expiry timer each time the user
     * makes an authenticated request. This means active users stay logged in
     * indefinitely, while inactive users are eventually logged out automatically.
     *
     * We use token_id (snake_case) with a fallback to tokenId (camelCase)
     * to support different database adapter naming conventions.
     */
    await authService.extendToken(user.token_id || user.tokenId);

    /**
     * Attach the validated user object to the request so that the downstream
     * route handler can access it without needing to look up the user again.
     *
     * We cast req to `any` here because Next.js's NextRequest type does not
     * include a `user` property by default — we are adding it dynamically.
     *
     * In your route handler you can access it like this:
     *   const user = (req as any).user;
     */
    (req as any).user = user;

    /**
     * Everything checks out — allow the request to proceed to the route handler.
     * NextResponse.next() tells Next.js to continue processing the request
     * as normal.
     */
    return NextResponse.next();

  } catch (err: any) {
    /**
     * An unexpected error occurred during token validation.
     * We log only the error message (not the full error object or stack trace)
     * to avoid accidentally exposing token values or sensitive user data
     * that might appear in a full stack trace.
     *
     * We return a 500 response with a generic message — we intentionally do
     * not expose internal error details to the client for security reasons.
     */
    console.error('[auth-guard] Authentication check failed:', err.message);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}