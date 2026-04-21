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
  clean = clean.replace(/\\n/g, '\n')
  clean = clean.replace(/\r/g, '')

  return clean
}

/* =========================================================
   🔥 SERVICE ACCOUNT (BACKEND)
========================================================= */
export function parseFirebaseServiceAccount(raw?: string) {
  console.log('🔥 [1] RAW INPUT RECEIVED:', raw)

  if (!raw) {
    console.error('❌ [1] Missing Firebase env')
    throw new Error('Missing Firebase service account env')
  }

  let clean = raw.trim()
  console.log('🔥 [2] AFTER TRIM:', clean.slice(0, 120))

  // remove wrapping quotes
  while (
    (clean.startsWith('"') && clean.endsWith('"')) ||
    (clean.startsWith("'") && clean.endsWith("'"))
  ) {
    clean = clean.slice(1, -1).trim()
  }
  console.log('🔥 [3] AFTER STRIP QUOTES:', clean.slice(0, 120))

  /**
   * STEP 1: detect broken newline issue
   */
  const hasRealNewlines = clean.includes('\n')
  console.log('🔥 [4] HAS REAL NEWLINES:', hasRealNewlines)

  /**
   * STEP 2: normalize newline formats
   */
  clean = clean.replace(/\r\n/g, '\n')
  console.log('🔥 [5] AFTER \\r\\n NORMALIZE')

  clean = clean.replace(/\n/g, '\\n')
  console.log('🔥 [6] AFTER ESCAPING NEWLINES')

  /**
   * STEP 3: fix escaped quotes
   */
  clean = clean.replace(/\\"/g, '"')
  console.log('🔥 [7] AFTER UNESCAPING QUOTES')

  let parsed: any

  try {
    console.log('🔥 [8] ATTEMPTING JSON.parse...')
    parsed = JSON.parse(clean)
    console.log('✅ [9] JSON PARSE SUCCESS')
  } catch (err) {
    console.error('❌ [9] JSON PARSE FAILED')
    console.error('❌ CLEAN VALUE AT FAILURE:', clean)
    throw new Error('Invalid Firebase service account JSON')
  }

  /**
   * STEP 4: fix private key formatting
   */
  if (parsed.private_key) {
    console.log('🔥 [10] RAW PRIVATE KEY FOUND')

    parsed.private_key = parsed.private_key
      .replace(/\\n/g, '\n')
      .replace(/\r/g, '')
      .trim()

    console.log('🔥 [11] PRIVATE KEY FIXED')
  } else {
    console.warn('⚠️ [10] NO PRIVATE KEY FOUND')
  }

  console.log('✅ [12] FINAL PARSE COMPLETE')

  return parsed
}

/* =========================================================
   🔥 WEB CONFIG (FRONTEND)
========================================================= */
export function parseFirebaseWebConfig(raw?: string) {
  const clean = cleanEnvString(raw)

  try {
    return JSON.parse(clean)
  } catch {
    try {
      const fixed = clean.replace(
        /([{,]\s*)([a-zA-Z0-9_]+)\s*:/g,
        '$1"$2":'
      )
      return JSON.parse(fixed)
    } catch (err) {
      console.error('❌ WEB CONFIG PARSE FAILED:', clean)
      throw new Error('Invalid Firebase web config JSON')
    }
  }
}