/**
 * firebaseEnvUtils.ts
 *
 * A collection of utility functions for safely reading Firebase configuration
 * values from environment variables and converting them into usable objects.
 *
 * Background — why this file exists:
 *   Firebase credentials are stored as JSON strings inside environment
 *   variables (e.g. in a .env file or a hosting provider's dashboard).
 *   In practice these strings often arrive with extra wrapping quotes, escaped
 *   characters, or Windows-style line endings introduced by copy-paste or
 *   by different CI/CD systems. This file provides a single, reliable place
 *   to handle all that messiness before the rest of the app ever sees the data.
 *
 * Functions exported:
 *   cleanEnvString           — strips quotes and normalises a raw env string.
 *   parseFirebaseServiceAccount — parses the backend service-account JSON.
 *   parseFirebaseWebConfig      — parses the frontend web-config JSON.
 */

// ---------------------------------------------------------------------------
// cleanEnvString
// ---------------------------------------------------------------------------

/**
 * cleanEnvString
 *
 * Takes a raw environment variable string and cleans it up so it can be
 * safely used or parsed as JSON.
 *
 * Problems this function solves:
 *
 *  1. Missing value — if the env var is undefined or empty, we throw
 *     immediately with a clear message rather than letting a confusing
 *     error surface deeper in the code.
 *
 *  2. Wrapping quotes — some systems double-wrap the value:
 *       '"{"apiKey":"abc"}"'  →  '{"apiKey":"abc"}'
 *     The while-loop keeps stripping one layer of matching quotes at a
 *     time until the value is no longer wrapped.
 *
 *  3. Escaped inner quotes — if the JSON was serialised with backslash-
 *     escaped quotes (e.g. \"key\":\"value\"), this converts them back
 *     to real quote characters so JSON.parse can understand them.
 *
 *  4. Windows carriage returns (\r) — Windows line endings are \r\n.
 *     If the .env file was created on Windows, the \r can sneak into
 *     string values and cause silent parse failures. We strip them here.
 *
 * @param {string} [raw] - The raw value of the environment variable.
 *                         Marked optional because process.env lookups can
 *                         return undefined when the variable is not set.
 * @returns {string}       The cleaned string, ready to be used or parsed.
 *
 * @throws {Error} If `raw` is undefined or an empty string.
 *
 * @example
 *   cleanEnvString('"hello"')   // → 'hello'
 *   cleanEnvString("'world'")   // → 'world'
 *   cleanEnvString('  "hi"  ')  // → 'hi'
 */
export function cleanEnvString(raw?: string): string {
  if (!raw) throw new Error('Missing Firebase env value')

  let clean = raw.trim()

  // Keep removing one layer of matching outer quotes on each iteration.
  // Example progression: '"\'{"a":1}\'"' → '\'{"a":1}\'' → '{"a":1}'
  while (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim()
  }

  // Convert backslash-escaped quotes (e.g. \") back to real double quotes (").
  // This is necessary when the JSON was stored with escaped quotes inside
  // an outer string wrapper.
  clean = clean.replace(/\\"/g, '"')

  // Remove Windows carriage-return characters (\r).
  // These are invisible but break JSON.parse if left in place.
  clean = clean.replace(/\r/g, '')

  return clean
}

// ---------------------------------------------------------------------------
// parseFirebaseServiceAccount
// ---------------------------------------------------------------------------

/**
 * parseFirebaseServiceAccount
 *
 * Parses the Firebase *service account* JSON from an environment variable.
 * The service account is a sensitive server-side credential used to
 * authenticate the Firebase Admin SDK (used in API routes, not in the browser).
 *
 * Why this is more complex than a simple JSON.parse:
 *   Service account JSON contains a `private_key` field whose value is a
 *   multi-line PEM certificate. New-line characters inside JSON strings must
 *   be represented as the two-character sequence \n (backslash + n). However,
 *   different systems serialise and transport this in different ways:
 *
 *   • Some store the JSON with real newline characters inside the string,
 *     which is technically invalid JSON but happens in practice.
 *   • Some store it with double-escaped newlines (\\n) because the whole
 *     JSON was wrapped in another string layer.
 *   • Some add extra wrapping quotes around the whole value.
 *
 *   This function handles all of those variations in the correct order.
 *
 * Processing order (important — steps must not be reordered):
 *
 *  Step 1 — Strip wrapping quotes.
 *            If the whole value is wrapped in "..." or '...' by the env
 *            system, remove exactly one layer of those outer quotes.
 *
 *  Step 2 — Fix escaped inner quotes (if present).
 *            If the value contains \" sequences (meaning the JSON was
 *            stored inside another string), convert them to real " chars.
 *            ⚠️ We deliberately do NOT un-escape \\n → \n at this stage
 *            because JSON.parse itself correctly handles \n inside string
 *            values. Un-escaping too early would break the parse.
 *
 *  Step 3 — First JSON.parse attempt.
 *            Try to parse the cleaned string directly.
 *
 *  Step 4 — Fallback: re-escape literal newlines, then parse again.
 *            If step 3 fails, it may be because the private_key field
 *            contains real newline characters (ASCII 0x0A) instead of the
 *            escaped \n sequence. JSON.parse cannot handle real newlines
 *            inside a string value. We re-escape them and try once more.
 *
 *  Step 5 — Fix private_key newlines AFTER parsing.
 *            Once we have a parsed object, any remaining \\n sequences
 *            inside private_key (now a JavaScript string) need to become
 *            real newline characters so the PEM key is correctly formatted
 *            for use by the Firebase Admin SDK.
 *
 * @param {string} [raw] - The raw environment variable value containing the
 *                         service account JSON string.
 * @returns {object}       The parsed service account object ready to be
 *                         passed to firebase-admin's initializeApp().
 *
 * @throws {Error} If `raw` is undefined or empty.
 * @throws {Error} If the string cannot be parsed as valid JSON after all
 *                 recovery attempts are exhausted.
 */
export function parseFirebaseServiceAccount(raw?: string): object {
  if (!raw) throw new Error('Missing Firebase service account env')

  let cleaned = raw.trim()

  // ------------------------------------------------------------------
  // Step 1: Remove one layer of wrapping quotes if present.
  // We only strip a single layer here (unlike cleanEnvString which loops)
  // because over-stripping could corrupt the JSON body itself.
  // ------------------------------------------------------------------
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1)
  }

  // ------------------------------------------------------------------
  // Step 2: If the value contains backslash-escaped quotes, it was
  // stored as a string-within-a-string. Convert \" → " so the JSON
  // parser can see the real structure.
  //
  // ⚠️ We intentionally leave \\n untouched here. JSON.parse handles
  // the \n escape sequence correctly on its own. Converting \\n → \n
  // at this stage would insert a real newline character into the middle
  // of a JSON string, causing JSON.parse to fail.
  // ------------------------------------------------------------------
  if (cleaned.includes('\\"')) {
    cleaned = cleaned
      .replace(/\\"/g, '"')  // un-escape inner quotes
      .replace(/\\r/g, '')   // remove any escaped carriage returns
  }

  let parsed: any

  // ------------------------------------------------------------------
  // Step 3: First parse attempt — try the cleaned string directly.
  // ------------------------------------------------------------------
  try {
    parsed = JSON.parse(cleaned)
    console.log('Firebase service account: JSON parsed successfully')
  } catch {
    // ------------------------------------------------------------------
    // Step 4: Fallback parse — the private_key may contain literal
    // newline characters (real line breaks) inside what should be a
    // JSON string value. JSON.parse rejects these, so we replace every
    // real newline (\n, ASCII 0x0A) with the two-character escape
    // sequence \\n before trying again.
    // ------------------------------------------------------------------
    const reEscaped = cleaned.replace(/\n/g, '\\n')
    try {
      parsed = JSON.parse(reEscaped)
      console.log('Firebase service account: JSON parsed successfully after newline re-escaping')
    } catch {
      // Both attempts failed — the value is genuinely invalid JSON.
      throw new Error('Invalid Firebase service account JSON')
    }
  }

  // ------------------------------------------------------------------
  // Step 5: Normalise private_key newlines AFTER the object is parsed.
  //
  // At this point parsed.private_key is a JavaScript string. If it
  // still contains the two-character sequence \n (backslash + n) rather
  // than a real newline character, the PEM key will be malformed and
  // the Firebase Admin SDK will reject it. We convert them to real
  // newlines here, then trim any surrounding whitespace.
  // ------------------------------------------------------------------
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key
      .replace(/\\n/g, '\n')
      .trim()
  }

  return parsed
}

// ---------------------------------------------------------------------------
// parseFirebaseWebConfig
// ---------------------------------------------------------------------------

/**
 * parseFirebaseWebConfig
 *
 * Parses the Firebase *web config* JSON from an environment variable.
 * The web config is the client-side configuration object used to initialise
 * the Firebase JS SDK in the browser (contains apiKey, projectId, etc.).
 *
 * Unlike the service account, the web config does not contain private keys,
 * but it still arrives as a raw environment string that may need cleaning.
 *
 * Two parsing strategies are attempted in order:
 *
 *  Strategy 1 — Strict JSON.parse:
 *    Works when the value is a well-formed JSON string, e.g.:
 *      {"apiKey":"abc","projectId":"my-project"}
 *
 *  Strategy 2 — JavaScript-object-to-JSON conversion:
 *    Works when the value is formatted as a JS object literal rather than
 *    strict JSON, e.g.:
 *      {apiKey: "abc", projectId: "my-project"}
 *    JS object literals use unquoted keys, which are not valid JSON.
 *    The regex converts them: {apiKey: → {"apiKey":
 *    Then JSON.parse can handle the result.
 *
 * @param {string} [raw] - The raw environment variable value containing the
 *                         Firebase web config JSON (or JS object literal).
 * @returns {object}       The parsed Firebase web config object ready to be
 *                         passed to initializeApp().
 *
 * @throws {Error} If `raw` is undefined or empty.
 * @throws {Error} If the string cannot be parsed even after the JS-object
 *                 conversion fallback is applied.
 */
export function parseFirebaseWebConfig(raw?: string): object {
  if (!raw) throw new Error('Missing Firebase web config')

  // Use cleanEnvString to strip wrapping quotes, escaped quotes, and
  // carriage returns before attempting to parse.
  const clean = cleanEnvString(raw)

  // ------------------------------------------------------------------
  // Strategy 1: Strict JSON.parse.
  // Most well-configured environments will succeed here.
  // ------------------------------------------------------------------
  try {
    return JSON.parse(clean)
  } catch {
    // ------------------------------------------------------------------
    // Strategy 2: JS object literal → JSON conversion.
    //
    // The regex  /([{,]\s*)([a-zA-Z0-9_]+)\s*:/g  matches unquoted keys
    // that follow an opening brace { or a comma ,.
    //
    // Breakdown of the regex:
    //   ([{,]\s*)       — capture the { or , plus any whitespace after it
    //   ([a-zA-Z0-9_]+) — capture the unquoted key name
    //   \s*:            — match the colon (with optional spaces)
    //
    // Replacement '$1"$2":' re-inserts the captured brace/comma, wraps
    // the key in double quotes, and puts the colon back.
    //
    // Example:  {apiKey: "abc"  →  {"apiKey": "abc"
    // ------------------------------------------------------------------
    try {
      const fixed = clean.replace(
        /([{,]\s*)([a-zA-Z0-9_]+)\s*:/g,
        '$1"$2":'
      )
      return JSON.parse(fixed)
    } catch {
      // Both strategies failed — the value is not recoverable.
      throw new Error('Invalid Firebase web config JSON')
    }
  }
}