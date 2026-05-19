// /**
//  * forgotPassword.ts  (Server Action)
//  * ------------------------------------
//  * This is a Next.js "server action" — a function that runs exclusively on the server,
//  * never in the user's browser. It handles the first step of the password reset flow.
//  *
//  * What is 'use server'?
//  * ----------------------
//  * The 'use server' directive at the top tells Next.js that this file must only ever
//  * run on the server. This is important for security — it means sensitive operations
//  * like database access and token generation never happen on the client side.
//  *
//  * What does this action do?
//  * --------------------------
//  * When a user says "I forgot my password" and submits their email address, this function:
//  *
//  *  1. Checks that the database adapter supports the required operations
// //  *  2. Looks up the user by their email address
//  *  3. Generates a secure, random password reset token
//  *  4. Stores that token in the database with a 1-hour expiry time
//  *  5. TODO: Sends a reset link to the user's email (not yet implemented)
//  *
//  * What is a "reset token"?
//  * -------------------------
//  * A reset token is a long, randomly generated string (like a temporary password).
//  * It is stored in the database and emailed to the user as part of a link.
//  * When the user clicks the link, the app checks the token is valid and not expired,
//  * then allows them to set a new password.
//  *
//  * Security notes:
//  * ----------------
//  * - Tokens are generated using Node's built-in `crypto` module, which is
//  *   cryptographically secure (safe for use in security-sensitive flows).
//  * - Tokens expire after 1 hour to limit the window of misuse.
//  * - The token is stored as the `refresh_token_hash` field in nxf_system_tokens.
//  *   In a future improvement, this should be stored as a hash (e.g. SHA-256)
//  *   rather than the raw token, so even if the DB is compromised, tokens are safe.
//  */

// 'use server'

// import crypto from 'crypto'
// import { DBAdapter, DBConfig } from '@/app/db-adapter/types'

// /**
//  * ForgotPasswordInput
//  * --------------------
//  * The input this server action expects.
//  *
//  * @prop email   - The email address the user entered on the forgot password form
//  * @prop adapter - The database adapter for the user's chosen database type
//  * @prop config  - The database connection configuration (never logged or returned to client)
//  */
// interface ForgotPasswordInput {
//   email: string
//   adapter: DBAdapter
//   config: DBConfig
// }

// /**
//  * forgotPassword
//  * ---------------
//  * Initiates the password reset flow for a user who has forgotten their password.
//  *
//  * @param email   - The email address submitted by the user
//  * @param adapter - The active database adapter (must implement findUserByEmail and createToken)
//  * @param config  - The database connection config
//  *
//  * @returns An object with either:
//  *   - { error: string }          — if something went wrong (user not found, etc.)
//  *   - { success: true }          — if the reset token was created successfully
//  *
//  * ⚠️  PRODUCTION WARNING — see note inside the function about resetToken exposure.
//  */
// export async function forgotPassword({ email, adapter, config }: ForgotPasswordInput) {

//   // ── Step 1: Validate adapter capabilities ──
//   // Before doing any work, we check that the adapter implements the two database
//   // operations this function needs. Not all adapters may support every operation,
//   // so we fail early with a clear error rather than crashing mid-way through.
//   if (!adapter.findUserByEmail || !adapter.createToken) {
//     throw new Error(
//       'forgotPassword: The current database adapter does not implement ' +
//       'findUserByEmail and/or createToken. These are required for password reset.'
//     )
//   }

//   // ── Step 2: Look up the user by email ──
//   // We search the database for an account with this email address.
//   // If no account is found, we return a user-facing error message.
//   //
//   // Note on security: In some applications, you'd return a generic "if an account
//   // exists, you will receive an email" message here to prevent email enumeration
//   // attacks (where an attacker can tell which emails are registered). Consider
//   // this for a future improvement.
//   const user = await adapter.findUserByEmail(config, email)
//   if (!user) {
//     return { error: 'No account found with that email address.' }
//   }

//   // ── Step 3: Generate a secure reset token ──
//   // crypto.randomBytes(32) generates 32 bytes of cryptographically random data.
//   // Converting to 'hex' gives us a 64-character string that is effectively impossible to guess.
//   // This is the token that will be included in the password reset link sent to the user.
//   const resetToken = crypto.randomBytes(32).toString('hex')

//   // Set the token expiry to 1 hour from now.
//   // After this time, the token will be treated as invalid and the user
//   // will need to request a new reset link.
//   const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

//   // ── Step 4: Store the reset token in the database ──
//   // We store the token in the nxf_system_tokens table using the createToken adapter method.
//   // The reset token is stored in the refresh_token_hash field (repurposed for reset flow).
//   //
//   // TODO: Before going to production, store a SHA-256 hash of the token here instead of
//   // the raw token. This way, even if the database is breached, attackers can't use
//   // the stored values to reset passwords. Example:
//   //   const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
//   //   refresh_token_hash: tokenHash
//   await adapter.createToken({
//     token_id: crypto.randomUUID(),   // Unique ID for this token record
//     user_id: user.user_id,           // Links this token to the user who requested the reset
//     project_id: '',                  // Not required for auth tokens — left empty intentionally
//     access_token_hash: '',           // Not used in the reset flow — left empty intentionally
//     refresh_token_hash: resetToken,  // The reset token (see TODO above re: hashing)
//     access_expires_at: new Date(),   // Not used in the reset flow
//     refresh_expires_at: expiresAt,   // Token becomes invalid after 1 hour
//     revoked: false,                  // Token is active until used or expired
//     ip_address: null,                // Optional: could log requester IP for audit purposes
//     user_agent: null,                // Optional: could log requester browser for audit purposes
//     created_at: new Date(),
//     updated_at: new Date(),
//   })

//   // ── Step 5: Send reset email ──
//   // TODO: Implement email sending here. The reset link should look like:
//   //   https://yourcms.com/reset-password?token=<resetToken>
//   // Use your configured SMTP adapter (set up in Settings → SMTP) to send the email.
//   // Once email sending is implemented, remove resetToken from the return value below.

//   // ⚠️  SECURITY WARNING — MUST FIX BEFORE PRODUCTION ──
//   // Returning the raw resetToken to the client is acceptable during development/testing
//   // but is a serious security vulnerability in production.
//   // Anyone who intercepts or logs this response could use the token to reset
//   // any user's password without knowing their email.
//   //
//   // Before going live:
//   //  1. Send the token via email only (never return it to the client)
//   //  2. Change this return to simply: return { success: true }
//   //  3. Remove the resetToken field entirely from the response
//   if (process.env.NODE_ENV !== 'production') {
//     // Only expose the token in non-production environments for testing purposes
//     return { success: true, resetToken }
//   }

//   return { success: true }
// }