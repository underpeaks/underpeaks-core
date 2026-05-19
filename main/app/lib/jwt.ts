/**
 * jwtUtils.ts
 *
 * A utility module for creating (signing) JSON Web Tokens (JWTs).
 *
 * What is a JWT?
 *   A JSON Web Token is a compact, self-contained string used to securely
 *   transmit information between parties (e.g. between your server and a
 *   browser). It is most commonly used for authentication: after a user logs
 *   in, the server creates a JWT and sends it to the browser. The browser
 *   stores it and includes it in future requests so the server can verify
 *   the user's identity without needing to look them up in the database on
 *   every single request.
 *
 *   A JWT looks like this:
 *     eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123...
 *   It has three Base64-encoded parts separated by dots:
 *     1. Header  — algorithm used to sign the token
 *     2. Payload — the data you stored inside (e.g. userId, role)
 *     3. Signature — a cryptographic proof the token hasn't been tampered with
 *
 * What is "signing" a JWT?
 *   Signing means using a secret string to generate the third part
 *   (the signature). Anyone who has the token can read the payload (it is
 *   not encrypted), but only someone who knows the secret can produce a
 *   valid signature. This means the server can trust that a token it
 *   receives was genuinely issued by itself and hasn't been modified.
 *
 * ⚠️  Security warning — JWT_SECRET:
 *   The fallback value 'change_this_secret' is a placeholder for local
 *   development ONLY. In any deployed environment (staging, production)
 *   you MUST set the JWT_SECRET environment variable to a long, random,
 *   secret string. If you leave the fallback in place on a live server,
 *   anyone who reads this source code can forge valid tokens for any user.
 *
 * Exports:
 *   signJwt(payload, options?) — creates and returns a signed JWT string.
 */

import jwt from 'jsonwebtoken'

/**
 * JWT_SECRET
 *
 * The secret key used to sign all JWTs produced by this application.
 *
 * Reads from the JWT_SECRET environment variable at startup.
 * Falls back to the placeholder string 'change_this_secret' so the app
 * can run locally without any extra setup — but see the security warning
 * in the module comment above before deploying.
 *
 * This value is intentionally a module-level constant so it is read once
 * when the module is first imported, rather than on every function call.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret'

/**
 * signJwt
 *
 * Creates a signed JWT containing the given payload and returns it as a
 * plain string that can be sent to the client (e.g. in a response header,
 * a cookie, or a JSON response body).
 *
 * Default behaviour:
 *   - The token expires in 1 hour ('1h') unless overridden via `options`.
 *   - Any extra options passed in are merged on top of the defaults, so
 *     individual call sites can customise expiry time, audience, issuer, etc.
 *
 * How expiry works:
 *   An expired token will be rejected by any verification step that uses
 *   jwt.verify(). This limits the damage if a token is stolen — after 1 hour
 *   it becomes useless without the user logging in again.
 *
 * @param {object}           payload - The data to embed inside the token.
 *                                     Common fields: { userId, role, email }.
 *                                     Keep this small — the payload is
 *                                     Base64-encoded but NOT encrypted, so
 *                                     never include passwords or secrets here.
 *
 * @param {jwt.SignOptions}  [options] - Optional jsonwebtoken sign options that
 *                                      override or extend the defaults.
 *                                      See the jsonwebtoken docs for all
 *                                      available fields (expiresIn, audience,
 *                                      issuer, subject, algorithm, etc.).
 *
 * @returns {string} A signed JWT string in the format "header.payload.signature".
 *
 * @example
 *   // Basic usage — 1-hour token with default settings
 *   const token = signJwt({ userId: '123', role: 'admin' })
 *
 * @example
 *   // Custom expiry — useful for "remember me" or short-lived OTP flows
 *   const token = signJwt({ userId: '123' }, { expiresIn: '7d' })
 */
export function signJwt(payload: object, options?: jwt.SignOptions): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h',  // Default: token becomes invalid after 1 hour
    ...(options || {}), // Spread any caller-supplied options last so they
                        // take precedence over the defaults above
  })
}