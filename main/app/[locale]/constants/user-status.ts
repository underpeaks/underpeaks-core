/**
 * USER_STATUS Constants
 *
 * This file defines all possible states a user account can be in throughout
 * the application. It is the single source of truth for user status values —
 * any code that needs to check, set, or compare a user's status should import
 * from here rather than using raw strings like 'active' or 'blocked'.
 *
 * Why use a constant object instead of plain strings?
 * ────────────────────────────────────────────────────
 * If you write `if (user.status === 'actve')` (a typo), TypeScript and your
 * editor won't catch it. But if you write `if (user.status === USER_STATUS.ACTIVE)`,
 * TypeScript will immediately flag any misspelling of ACTIVE as an error.
 * This makes the code safer and easier to refactor — if a status value ever
 * needs to change (e.g. 'active' → 'enabled'), you only update it in one place.
 *
 * The `as const` assertion:
 * ──────────────────────────
 * Without `as const`, TypeScript would infer the type of USER_STATUS.ACTIVE
 * as the broad type `string`. With `as const`, it is inferred as the narrow
 * literal type `'active'`. This is important because it allows TypeScript to
 * enforce that only known status strings are ever assigned to a UserStatus
 * typed variable.
 *
 * Usage examples:
 * ───────────────
 *   import { USER_STATUS, UserStatus } from '@/constants/userStatus'
 *
 *   // Checking a user's status:
 *   if (user.status === USER_STATUS.ACTIVE) {
 *     // allow access
 *   }
 *
 *   // Typing a function parameter that accepts any valid status:
 *   function updateStatus(userId: string, status: UserStatus) { ... }
 *
 *   // Storing a status value:
 *   const status: UserStatus = USER_STATUS.BLOCKED
 */

/**
 * USER_STATUS
 *
 * An immutable (read-only) map of every valid user account status.
 * Use these values anywhere a user status string is needed — in API calls,
 * database writes, conditional rendering, and access-control checks.
 *
 * Status descriptions:
 *
 *   ACTIVE
 *     The user's account is fully set up and in good standing. They can log
 *     in and use the application without restrictions.
 *
 *   NEEDS_EMAIL_VERIFICATION
 *     The user has registered but has not yet clicked the verification link
 *     sent to their email address. Certain features may be restricted until
 *     they verify.
 *
 *   PASSWORD_RESET_REQUESTED
 *     The user has initiated a password reset flow (e.g. via "Forgot Password").
 *     The account is temporarily in this state until the reset is completed
 *     or the reset link expires.
 *
 *   BLOCKED
 *     The user's account has been blocked by an administrator — for example,
 *     due to a policy violation or suspicious activity. They cannot log in
 *     while in this state.
 *
 *   DISABLED
 *     The user's account has been disabled, typically by the user themselves
 *     or by an admin performing a soft-delete. Unlike BLOCKED, this is usually
 *     a deliberate deactivation rather than a punitive action.
 */
export const USER_STATUS = {
  ACTIVE:                   'active',
  NEEDS_EMAIL_VERIFICATION: 'needs_email_verification',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  BLOCKED:                  'blocked',
  DISABLED:                 'disabled',
} as const

/**
 * UserStatus
 *
 * A TypeScript union type automatically derived from the values of USER_STATUS.
 * It expands to:
 *   'active' | 'needs_email_verification' | 'password_reset_requested' | 'blocked' | 'disabled'
 *
 * Use this type to annotate any variable, parameter, or return value that
 * holds a user status string. TypeScript will then prevent any value that is
 * not one of the five known statuses from being assigned.
 *
 * Example:
 *   const status: UserStatus = 'active'       // ✓ valid
 *   const status: UserStatus = 'suspended'    // ✗ TypeScript error
 */
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]