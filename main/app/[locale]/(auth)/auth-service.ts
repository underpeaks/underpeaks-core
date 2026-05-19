import { DBAdapter, DBConfig } from "../../db-adapter/types";
import crypto from "crypto";

/**
 * @file auth-service.ts
 * @description
 * This file contains the `AuthService` class — the central service that handles
 * all authentication-related operations in the application.
 *
 * What is a service class?
 * -------------------------
 * A service class is a way of grouping related logic together in one place.
 * Instead of scattering authentication code across many files, AuthService
 * provides a single, clean interface for everything auth-related:
 * login, register, logout, password reset, token validation, and token issuing.
 *
 * What is the DBAdapter pattern?
 * --------------------------------
 * This app supports multiple database backends (PostgreSQL, MySQL, MongoDB,
 * Firebase, Supabase). Rather than writing separate auth logic for each one,
 * we use a DBAdapter interface — a standard set of method signatures that every
 * database adapter must implement. AuthService calls adapter methods without
 * needing to know which database is actually underneath.
 *
 * Think of it like a universal remote control — the buttons (AuthService methods)
 * are always the same, but the device being controlled (the adapter) can vary.
 *
 * How are tokens handled?
 * ------------------------
 * For SQL and MongoDB adapters, this service issues its own access and refresh
 * tokens using Node's built-in `crypto` module:
 *   - A random UUID is generated as the raw token value (sent to the client).
 *   - A SHA-256 hash of that token is stored in the database (never the raw value).
 *   - When validating, the incoming token is hashed and compared to the stored hash.
 *
 * This means that even if the database is compromised, the attacker cannot use
 * the stored hashes to authenticate — they need the original raw token values.
 *
 * Firebase and Supabase manage their own token systems but still go through
 * this service for token issuing when needed.
 *
 * ⚠️  Security rules for this file:
 *   - Never log raw token values (accessToken, refreshToken)
 *   - Never log password values or hashes
 *   - Never log token hashes — they are one-way security credentials
 *   - Only log sanitised, non-sensitive operational info
 */

/**
 * @class AuthService
 * @description
 * Provides all authentication operations for the application.
 * Delegates database work to the injected DBAdapter so the same
 * service logic works across all supported database backends.
 *
 * @example
 * ```ts
 * const authService = new AuthService(postgresAdapter, dbConfig);
 * const tokens = await authService.issueTokens({ userId: 'abc123' });
 * ```
 */
export class AuthService {
  /**
   * @constructor
   * @param {DBAdapter} adapter
   *   The database adapter for the current project (e.g. PostgresAdapter,
   *   MongoAdapter). Must implement the DBAdapter interface.
   *   Marked `readonly` because it should never be replaced after construction.
   *
   * @param {DBConfig} config
   *   The configuration object passed to adapter methods (connection strings,
   *   credentials, etc.). Marked `readonly` for the same reason.
   */
  constructor(
    private readonly adapter: DBAdapter,
    private readonly config: DBConfig
  ) {}

  // ─── Core Auth Methods ────────────────────────────────────────────────────

  /**
   * @method login
   * @description
   * Authenticates a user with their email and password.
   * Delegates entirely to the adapter's login implementation, which handles
   * password comparison and session/token creation for its specific database.
   *
   * Throws if the adapter does not support login (e.g. a read-only adapter).
   *
   * @param {string} email - The user's email address.
   * @param {string} password - The user's plain-text password.
   *   ⚠️ Never log this value.
   * @returns {Promise<any>} The adapter's login result (typically includes tokens and user data).
   * @throws {Error} If the adapter does not implement login.
   */
  async login(email: string, password: string) {
    if (!this.adapter.login) throw new Error("Login not supported for this adapter");
    return this.adapter.login(this.config, email, password);
  }

  /**
   * @method register
   * @description
   * Creates a new user account in the database.
   * Delegates to the adapter's register implementation, which handles
   * password hashing and user record creation for its specific database.
   *
   * Throws if the adapter does not support registration.
   *
   * @param {{ email: string; password: string; full_name?: string }} data
   *   The new user's details. full_name is optional.
   *   ⚠️ Never log the password field from this object.
   * @returns {Promise<any>} The adapter's register result (typically the created user).
   * @throws {Error} If the adapter does not implement register.
   */
  async register(data: { email: string; password: string; full_name?: string }) {
    if (!this.adapter.register) throw new Error("Register not supported for this adapter");
    return this.adapter.register(this.config, data);
  }

  /**
   * @method getCurrentUser
   * @description
   * Retrieves the currently authenticated user based on a token.
   * Used by API routes that need to know who is making the request.
   *
   * Returns null (instead of throwing) if the adapter doesn't support this
   * method, making it safe to call without a try/catch in most cases.
   *
   * @param {string} [token] - The user's access token. Optional.
   *   ⚠️ Never log this value.
   * @returns {Promise<any | null>} The user object, or null if not found/unsupported.
   */
  async getCurrentUser(token?: string) {
    if (!this.adapter.getCurrentUser) return null;
    return this.adapter.getCurrentUser(this.config, token);
  }

  /**
   * @method logout
   * @description
   * Logs the user out by revoking or invalidating their token.
   * Delegates to the adapter's logout implementation.
   *
   * If the adapter doesn't implement logout, we return a success response
   * anyway — this handles adapters (like some Firebase setups) where
   * logout is managed entirely client-side.
   *
   * @param {string} [token] - The user's access token to revoke. Optional.
   *   ⚠️ Never log this value.
   * @returns {Promise<{ success: true } | any>}
   */
  async logout(token?: string) {
    if (!this.adapter.logout) return { success: true };
    return this.adapter.logout(this.config, token);
  }

  // ─── Password Reset Methods ───────────────────────────────────────────────

  /**
   * @method sendResetEmail
   * @description
   * Triggers a password reset email to be sent to the specified address.
   * The email will contain a link with a reset token pointing to the redirectUrl.
   *
   * Delegates to the adapter's sendResetEmail implementation, which handles
   * token generation, storage, and email delivery for its specific database.
   *
   * Throws if the adapter does not support password reset.
   *
   * @param {string} email - The email address to send the reset link to.
   * @param {string} redirectUrl - The URL the reset link should point to
   *   (e.g. https://yourapp.com/reset-password).
   * @returns {Promise<any>} The adapter's result (typically a success indicator).
   * @throws {Error} If the adapter does not implement sendResetEmail.
   */
  async sendResetEmail(email: string, redirectUrl: string) {
    if (!this.adapter.sendResetEmail) {
      throw new Error("Password reset not supported for this adapter");
    }
    return this.adapter.sendResetEmail(this.config, email, redirectUrl);
  }

  /**
   * @method resetPassword
   * @description
   * Resets a user's password using a valid reset token.
   * The token was previously generated by sendResetEmail and sent to the user.
   *
   * Delegates to the adapter's resetPassword implementation, which validates
   * the token and updates the password hash in the database.
   *
   * Throws if the adapter does not support password reset.
   *
   * @param {string} token - The password reset token from the email link.
   *   ⚠️ Never log this value — it is a one-time security credential.
   * @param {string} newPassword - The user's new plain-text password.
   *   ⚠️ Never log this value under any circumstances.
   * @returns {Promise<any>} The adapter's result (typically a success indicator).
   * @throws {Error} If the adapter does not implement resetPassword.
   */
  async resetPassword(token: string, newPassword: string) {
    if (!this.adapter.resetPassword) {
      throw new Error("Password reset not supported for this adapter");
    }
    return this.adapter.resetPassword(this.config, token, newPassword);
  }

  // ─── Token Management Methods ─────────────────────────────────────────────

  /**
   * @method extendToken
   * @description
   * Extends the expiry time of an existing token — implementing a "sliding session".
   *
   * What is a sliding session?
   * A sliding session resets the token's expiry each time the user makes an
   * authenticated request. This keeps active users logged in without requiring
   * them to re-authenticate, while inactive users are eventually logged out.
   *
   * Default expiry extensions applied if no custom dates are provided:
   *   - Access token:  1 hour from now
   *   - Refresh token: 24 hours from now
   *
   * Silently does nothing if the adapter does not support token extension,
   * so it is safe to call unconditionally in the auth guard.
   *
   * @param {string} tokenId - The unique ID of the token record to extend.
   *   This is the token's database row ID, not the raw token value.
   * @param {{ access_expires_at?: Date; refresh_expires_at?: Date }} [data]
   *   Optional custom expiry dates. If omitted, defaults are used.
   * @returns {Promise<any | void>}
   */
  async extendToken(
    tokenId: string,
    data?: { access_expires_at?: Date; refresh_expires_at?: Date }
  ) {
    if (!this.adapter.extendToken) return;

    /**
     * Build the expiry payload.
     * If the caller provided custom dates we use those; otherwise we calculate
     * defaults relative to the current time using Date.now().
     *
     * Date.now() returns milliseconds since epoch, so:
     *   60 * 60 * 1000       = 1 hour in milliseconds
     *   24 * 60 * 60 * 1000  = 24 hours in milliseconds
     */
    const payload = {
      access_expires_at:
        data?.access_expires_at ??
        new Date(Date.now() + 60 * 60 * 1000),        // Default: 1 hour from now
      refresh_expires_at:
        data?.refresh_expires_at ??
        new Date(Date.now() + 24 * 60 * 60 * 1000),   // Default: 24 hours from now
    };

    return this.adapter.extendToken(tokenId, payload);
  }

  /**
   * @method validateAccessToken
   * @description
   * Checks whether an access token is valid and has not been revoked.
   *
   * How it works:
   *   1. Calls adapter.findTokenByAccessToken() which looks up the token in
   *      the database by its hash (the raw token is hashed before comparison).
   *   2. If no record is found, the token doesn't exist — return null.
   *   3. If the token record has revoked: true, the token has been invalidated
   *      (e.g. by a logout call) — return null.
   *   4. If the token is found and not revoked, return the full token record
   *      (which includes the associated user data).
   *
   * Returns null instead of throwing so callers can do a simple null check.
   *
   * @param {string} token - The raw access token to validate.
   *   ⚠️ Never log this value — it is a live authentication credential.
   * @returns {Promise<any | null>} The token record with user data, or null if invalid.
   */
  async validateAccessToken(token: string) {
    if (!this.adapter.findTokenByAccessToken) return null;
    const tokenData = await this.adapter.findTokenByAccessToken(token);
    if (!tokenData || tokenData.revoked) return null;
    return tokenData;
  }

  /**
   * @method issueTokens
   * @description
   * Generates a new access token and refresh token pair for a user and
   * stores them in the database. Used after a successful login or registration.
   *
   * Used by: SQL adapters (PostgreSQL, MySQL) and MongoDB adapter.
   * Firebase and Supabase manage their own token systems but may still call
   * this method when a custom token record is needed.
   *
   * How token security works here:
   * --------------------------------
   * We never store raw token values in the database. Instead:
   *   1. A random UUID is generated as the raw token (this is what the client receives).
   *   2. The raw token is hashed with SHA-256.
   *   3. Only the hash is stored in the database.
   *
   * When validating a token later, the incoming raw token is hashed again and
   * compared to the stored hash. This means a database breach does not expose
   * usable tokens — attackers would need to reverse the SHA-256 hash, which is
   * computationally infeasible.
   *
   * Token lifetimes:
   *   - Access token:  15 minutes — short-lived, used for API authentication
   *   - Refresh token: 30 days    — long-lived, used to get a new access token
   *
   * @param {{ userId: string; projectId?: string | null }} input
   *   - userId:    The ID of the user these tokens are being issued for.
   *   - projectId: Optional project scope for multi-tenant applications.
   *                Stored with the token for scoped access control.
   *
   * @returns {Promise<{
   *   accessToken: string;
   *   refreshToken: string;
   *   accessExpiresAt: Date;
   *   refreshExpiresAt: Date;
   * }>}
   * The raw (unhashed) token values and their expiry dates.
   * ⚠️ The raw tokens are returned here for the caller to send to the client.
   *    Never log these values.
   *
   * @throws {Error} If the adapter does not implement createToken.
   */
  async issueTokens(input: { userId: string; projectId?: string | null }) {
    if (!this.adapter.createToken) {
      throw new Error("Token issuing not supported for this adapter");
    }

    /**
     * Generate raw token values using crypto.randomUUID().
     * These are cryptographically random UUIDs — safe for use as auth tokens.
     * ⚠️ Never log these values — they are live authentication credentials.
     */
    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();

    /**
     * Hash both tokens with SHA-256 before storing in the database.
     * We store only the hashes — never the raw values.
     * This way, even if the database is breached, the tokens cannot be used.
     * ⚠️ Never log these hash values either — they are security credentials.
     */
    const accessTokenHash = crypto
      .createHash("sha256")
      .update(accessToken)
      .digest("hex");

    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    /**
     * Calculate token expiry timestamps.
     * We capture `now` once so both timestamps are consistent.
     *
     * Access token:  15 minutes  (15 * 60 * 1000 ms) — short-lived for security
     * Refresh token: 30 days     (30 * 24 * 60 * 60 * 1000 ms) — long-lived for convenience
     */
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    /**
     * Persist the token record to the database via the adapter.
     * We store hashes (not raw tokens), expiry dates, and metadata.
     *
     * token_id is a new random UUID that uniquely identifies this token record
     * in the database — separate from the token values themselves.
     */
    await this.adapter.createToken({
      token_id: crypto.randomUUID(),
      user_id: input.userId,
      project_id: input.projectId ?? null,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      revoked: false,
      created_at: now,
      updated_at: now,
    });

    /**
     * Return the raw (unhashed) token values and expiry dates to the caller.
     * The caller (typically a login or register route) will send these to the client.
     * ⚠️ Never log these return values.
     */
    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  }
}