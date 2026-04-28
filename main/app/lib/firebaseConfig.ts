export function cleanEnvString(raw?: string) {
  if (!raw) throw new Error('Missing Firebase env value')

  let clean = raw.trim()

  // remove wrapping quotes repeatedly
  while (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim()
  }

  clean = clean.replace(/\\"/g, '"')
  clean = clean.replace(/\r/g, '')

  return clean
}

/* =========================================================
   🔥 SERVICE ACCOUNT (BACKEND) — FIXED VERSION
========================================================= */
export function parseFirebaseServiceAccount(raw?: string) {
  console.log('🔥 [SERVICE ACCOUNT] RAW INPUT:', raw?.slice(0, 200))

  if (!raw) throw new Error('Missing Firebase service account env')

  let cleaned = raw.trim()

  // 1. Remove wrapping quotes safely
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1)
  }

  // 2. If it's double-escaped JSON, fix quote escaping ONLY
  // ⚠️ Do NOT replace \\n → \n here — that breaks JSON.parse
  if (cleaned.includes('\\"')) {
    cleaned = cleaned
      .replace(/\\"/g, '"')
      .replace(/\\r/g, '')
    // Leave \\n as-is — JSON.parse handles \n inside strings correctly
  }

  let parsed: any

  try {
    parsed = JSON.parse(cleaned)
    console.log('✅ JSON PARSE SUCCESS')
  } catch (err) {
    // Last resort: maybe the private key has literal newlines already
    // Re-escape them so JSON.parse can handle the string
    const reEscaped = cleaned.replace(/\n/g, '\\n')
    try {
      parsed = JSON.parse(reEscaped)
      console.log('✅ JSON PARSE SUCCESS (after re-escaping newlines)')
    } catch (err2) {
      console.error('❌ FINAL RAW VALUE:', cleaned)
      throw new Error('Invalid Firebase service account JSON')
    }
  }

  // 3. Fix private key AFTER parsing — convert \\n → real newlines
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key
      .replace(/\\n/g, '\n')
      .trim()
  }

  return parsed
}
/* =========================================================
   🔥 WEB CONFIG (FRONTEND) — CLEANED
========================================================= */
export function parseFirebaseWebConfig(raw?: string) {
  if (!raw) throw new Error('Missing Firebase web config')

  const clean = cleanEnvString(raw)

  try {
    // First attempt: strict JSON
    return JSON.parse(clean)
  } catch (err) {
    try {
      // fallback: convert JS object style → JSON
      const fixed = clean.replace(
        /([{,]\s*)([a-zA-Z0-9_]+)\s*:/g,
        '$1"$2":'
      )

      return JSON.parse(fixed)
    } catch (err2) {
      console.error('❌ WEB CONFIG PARSE FAILED:', clean)
      throw new Error('Invalid Firebase web config JSON')
    }
  }
}