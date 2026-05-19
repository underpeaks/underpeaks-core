// /**
//  * resetPassword.ts  (Server Action)
//  * -----------------------------------
//  * This is a Next.js "server action" — it runs exclusively on the server, never in the browser.
//  * It handles the SECOND step of the password reset flow — actually changing the password.
//  *
//  * Where does this fit in the reset flow?
//  * ----------------------------------------
//  * Step 1 — forgotPassword.ts:
//  *   The user submits their email. A reset token is generated and emailed to them
//  *   as a link (e.g. https://yourcms.com/reset-password?token=abc123...)
//  *
//  * Step 2 — THIS FILE (resetPassword.ts):
//  *   The user clicks the link in their email, lands on the reset page, enters a new password,
//  *   and submits. This function receives the token from the URL and the new password,
//  *   then validates the token and updates the user's password in the database.
//  *
//  * What does this action do step by step?
//  * ----------------------------------------
//  *  1. Validates that the database adapter supports the required operations
//  *  2. Looks up the reset token in the database
//  *  3. Checks the token is valid — not already used, not expired
//  *  4. Hashes the new password using bcrypt (never stores plain text passwords)
//  *  5. Updates the user's password record in the database
//  *  6. Revokes (invalidates) the token so it cannot be used again
//  *
//  * What is bcrypt?
//  * ----------------
//  * bcrypt is a password hashing algorithm specifically designed for storing passwords safely.
//  * It is intentionally slow (controlled by the "cost factor") which makes it extremely
//  * difficult for attackers to brute-force hashed passwords even if they get the database.
//  * We NEVER store plain text passwords — only the bcrypt hash.
//  *
//  * What is token revocation?
//  * --------------------------
//  * Once a reset token has been used to change a password, it is "revoked" (marked as used).
//  * This prevents the same reset link from being used a second time — important because
//  * if someone intercepts the reset email, they should not be able to use it after
//  * the legitimate user has already completed the reset.
//  */

// 'use server'

// import bcrypt from 'bcryptjs'
// import { DBAdapter, DBConfig } from '@/app/db-adapter/types'

// /**
//  * ResetPasswordInput
//  * -------------------
//  * The data this server action expects to receive.
//  *
//  * @prop token       - The reset token from the URL query parameter (e.g. ?token=abc123...).
//  *                     This is the same token that was generated in forgotPassword.ts and
//  *                     emailed to the user. Never log this value.
//  * @prop newPassword - The new password the user wants to set. Never log this value.
//  * @prop adapter     - The database adapter for the user's chosen database type.
//  * @prop config      - The database connection configuration. Never log this value.
//  */
// interface ResetPasswordInput {
//   token: string
//   newPassword: string
//   adapter: DBAdapter
//   config: DBConfig
// }

// /**
//  * resetPassword
//  * --------------
//  * Validates a password reset token and updates the user's password.
//  *
//  * @param token       - The reset token from the reset link URL
//  * @param newPassword - The new password chosen by the user
//  * @param adapter     - The active database adapter
//  * @param config      - The database connection config
//  *
//  * @returns An object with either:
//  *   - { error: string }   — a user-facing error message explaining what went wrong
//  *   - { success: true }   — the password was reset successfully
//  *
//  * ⚠️  Security rules for this function:
//  *   - Never log the token, newPassword, or passwordHash under any circumstances
//  *   - Never return the passwordHash or any internal token details to the client
//  *   - Always revoke the token after a successful reset
//  */
// export async function resetPassword({ token, newPassword, adapter, config }: ResetPasswordInput) {

//   // ── Step 1: Validate adapter capabilities ──
//   // We need two specific database operations to complete the reset.
//   // If the adapter doesn't implement them, we fail immediately with a clear error.
//   //  - findTokenByRefreshToken: looks up the reset token record in the database
//   //  - update: updates the user's password_hash field in nxf_users
//   if (!adapter.findTokenByRefreshToken || !adapter.update) {
//     throw new Error(
//       'resetPassword: The current database adapter does not implement ' +
//       'findTokenByRefreshToken and/or update. These are required for password reset.'
//     )
//   }

//   // ── Step 2: Look up the reset token in the database ──
//   // We search for a token record that matches the token from the URL.
//   // If no matching token is found, it means the link is invalid (e.g. already deleted,
//   // tampered with, or never existed).
//   //
//   // ⚠️  Never log the token variable — it is a security credential equivalent to a password.
//   const tokenRecord = await adapter.findTokenByRefreshToken(token)
//   if (!tokenRecord) {
//     return { error: 'Invalid or expired reset link. Please request a new one.' }
//   }

//   // ── Step 3a: Check the token has not already been used ──
//   // When a token is used to reset a password, it is "revoked" (marked as used).
//   // If someone tries to use the same reset link a second time, we reject it here.
//   if (tokenRecord.revoked) {
//     return { error: 'This reset link has already been used. Please request a new one.' }
//   }

//   // ── Step 3b: Check the token has not expired ──
//   // Reset tokens are only valid for 1 hour (set in forgotPassword.ts).
//   // If the expiry time has passed, the link is no longer valid.
//   if (new Date(tokenRecord.refresh_expires_at).getTime() < Date.now()) {
//     return { error: 'This reset link has expired. Please request a new one.' }
//   }

//   // ── Step 4: Hash the new password ──
//   // We never store plain text passwords. Before saving the new password to the database,
//   // we run it through bcrypt to produce a secure one-way hash.
//   //
//   // What is the cost factor (12)?
//   // --------------------------------
//   // The second argument to bcrypt.hash() is the "cost factor" (also called "salt rounds").
//   // It controls how computationally expensive the hashing is:
//   //  - Higher = slower to hash = harder for attackers to brute-force stolen hashes
//   //  - Lower  = faster = less secure
//   // 12 is the current industry-recommended minimum for production applications.
//   // It takes roughly 300-400ms per hash, which is acceptable for a one-time operation
//   // like password reset but prohibitively slow for an attacker trying millions of guesses.
//   //
//   // ⚠️  Never log newPassword or passwordHash under any circumstances.
//   const passwordHash = await bcrypt.hash(newPassword, 12)

//   // ── Step 5: Update the user's password in the database ──
//   // We write the new bcrypt hash to the password_hash field in the nxf_users table.
//   // The user_id comes from the token record, which links the token to the correct user.
//   //
//   // ⚠️  Only the hash is stored — the plain text password is never written to the database.
//   await adapter.update(config, 'nxf_users', tokenRecord.user_id, {
//     password_hash: passwordHash,
//   })

//   // ── Step 6: Revoke the token ──
//   // Now that the password has been changed, we immediately revoke the reset token
//   // so it cannot be used again. This is a critical security step.
//   //
//   // Why is this so important?
//   // --------------------------
//   // Without revoking the token:
//   //  - Anyone who intercepts the reset email could still change the password later
//   //  - The same link could be used repeatedly to lock the user out of their account
//   //
//   // We check if revokeToken is implemented first — it's optional in the adapter interface
//   // but should always be present in production. If it's missing, we log a warning.
//   if (adapter.revokeToken) {
//     await adapter.revokeToken(tokenRecord.token_id)
//   } else {
//     // This is a non-fatal warning — the password has been changed successfully,
//     // but the token has not been revoked. This is a security gap that should be fixed.
//     console.warn(
//       'resetPassword: adapter.revokeToken is not implemented. ' +
//       'The reset token has NOT been revoked and could be reused. ' +
//       'Implement revokeToken in your DB adapter to fix this security gap.'
//     )
//   }

//   // ── Step 7: Return success ──
//   // We return only a simple success flag — no internal details, no token info,
//   // no password hash. The calling UI can use this to show a success message
//   // and redirect the user to the sign-in page.
//   return { success: true }
// }