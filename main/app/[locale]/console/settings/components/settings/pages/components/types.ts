/**
 * types.ts — Shared types and utilities for the API Keys settings section.
 *
 * This file defines the TypeScript interfaces (data shapes) and helper
 * functions used across all components in the API Keys feature.
 *
 * Files that use these exports:
 * - ApiKeysList.tsx   → uses ApiKey, formatDate
 * - NewKeyModal.tsx   → uses NewKeyResult
 * - RevokeModal.tsx   → uses ApiKey (via onRevoke callback)
 * - GenerateKeyForm   → uses ApiKey indirectly through the parent
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * ApiKey
 *
 * Represents a single API key as returned by the server.
 * Each key belongs to a user and can be used to authenticate API requests.
 *
 * @property api_id       - The unique identifier for this API key on the server.
 *                          Used when making requests like reveal or revoke.
 *
 * @property name         - The human-readable label the user gave this key
 *                          when they created it (e.g. "Flutter App — Production").
 *
 * @property key_prefix   - The first few characters of the key
 *                          (e.g. "sk-abc"). Shown in the UI as a preview
 *                          so the user can identify the key without exposing it.
 *
 * @property status       - The current state of the key.
 *                          Typically "active" or "revoked".
 *
 * @property last_used_at - ISO 8601 timestamp of the last time this key was
 *                          used to make an API request. Null if it has never
 *                          been used.
 *
 * @property created_at   - ISO 8601 timestamp of when this key was created.
 *
 * @property revealedKey  - The full, unmasked API key string. This field is
 *                          NOT returned by the list endpoint — it is only
 *                          populated on the client side after the user clicks
 *                          the reveal button and the reveal endpoint responds.
 *                          Marked optional (?) because it starts as undefined.
 */
export interface ApiKey {
  api_id:       string
  name:         string
  key_prefix:   string
  status:       string
  last_used_at: string | null
  created_at:   string
  revealedKey?: string // Populated on the client after the user clicks reveal
}

/**
 * NewKeyResult
 *
 * Represents the data returned by the server immediately after a new API key
 * is successfully generated. This is a subset of ApiKey — the full key details
 * are not included here because the key itself is only revealed on demand.
 *
 * This is passed to the NewKeyModal to confirm what was just created.
 *
 * @property api_id  - The unique identifier assigned to the new key by the server.
 *
 * @property prefix  - The key prefix (first few characters) of the newly generated
 *                     key, used to display a masked preview in the success modal.
 *
 * @property name    - The name the user gave the key during creation.
 *                     Displayed in the success modal to confirm which key was made.
 */
export interface NewKeyResult {
  api_id: string
  prefix: string
  name:   string
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * formatDate
 *
 * Converts an ISO 8601 date string (e.g. "2024-03-15T10:30:00Z") into a
 * human-readable date in British format (e.g. "15 Mar 2024").
 *
 * This is used throughout the API Keys UI to display "Created" and
 * "Last used" dates in a consistent, readable format.
 *
 * Why 'en-GB'?
 * The en-GB locale formats dates as DD MMM YYYY (e.g. "15 Mar 2024"),
 * which is unambiguous and easy to read internationally — unlike en-US
 * which uses MM/DD/YYYY and can be confusing outside the United States.
 *
 * @param iso - An ISO 8601 date string as returned by the server.
 * @returns   A formatted date string, e.g. "15 Mar 2024".
 *
 * @example
 * formatDate('2024-03-15T10:30:00Z') // → "15 Mar 2024"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}