/**
 * apiKeyEncryption.ts
 *
 * A utility module responsible for securely encrypting and decrypting API key
 * strings before they are stored in (or retrieved from) the database.
 *
 * Why encryption matters here:
 *   API keys are sensitive secrets. If your database were ever compromised,
 *   plain-text keys would give an attacker immediate access to your users'
 *   external services. By encrypting keys at rest, an attacker who steals the
 *   database rows still cannot use the keys without also stealing the
 *   NXF_API_KEY_SECRET environment variable that lives only on your server.
 *
 * Algorithm chosen — AES-256-GCM:
 *   • AES-256  → industry-standard symmetric cipher with a 256-bit (32-byte) key.
 *   • GCM mode → "Galois/Counter Mode". Unlike older modes (CBC, ECB), GCM
 *                provides both confidentiality AND built-in authentication.
 *                The "auth tag" it produces lets the decryptor detect any
 *                tampering with the ciphertext before decryption even begins.
 *
 * Storage format (the string saved to the database):
 *   "<iv_base64>:<authTag_base64>:<encryptedData_base64>"
 *   All three parts are Base64-encoded and joined with colons so the whole
 *   thing is a single, safe plain-text string.
 *
 * Environment variable required:
 *   NXF_API_KEY_SECRET — any long, random string kept secret on the server.
 *   It is hashed to exactly 32 bytes so it works with AES-256 regardless of
 *   its original length. Never commit this value to source control.
 *
 * Exports:
 *   encryptApiKey(plainKey)  → encrypted storage string
 *   decryptApiKey(stored)    → original plain-text key
 */

import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * ALGORITHM
 *
 * The name of the cipher algorithm passed to Node's built-in `crypto` module.
 * 'aes-256-gcm' means:
 *   - AES  → Advanced Encryption Standard
 *   - 256  → 256-bit key length (requires exactly 32 bytes)
 *   - GCM  → Galois/Counter Mode (authenticated encryption)
 */
const ALGORITHM = 'aes-256-gcm'

/**
 * KEY_LENGTH
 *
 * AES-256 requires a key that is exactly 32 bytes long.
 * We keep this as a named constant (rather than a magic number) so the
 * intent is clear to anyone reading the code later.
 */
const KEY_LENGTH = 32

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * getEncryptionKey
 *
 * Reads the NXF_API_KEY_SECRET environment variable and converts it into a
 * 32-byte Buffer suitable for use as an AES-256 key.
 *
 * How the conversion works:
 *   The secret can be any length string (e.g. a long passphrase or a UUID).
 *   We run it through SHA-256, which always produces exactly 32 bytes — no
 *   matter how long or short the input is. This means:
 *     • Short secrets are NOT a security risk for key-length requirements
 *       (though a longer, random secret is still best practice).
 *     • Long secrets are NOT truncated in a lossy way; SHA-256 folds all
 *       the entropy into its fixed 32-byte output.
 *
 * Throws:
 *   An Error if NXF_API_KEY_SECRET is missing from the environment, because
 *   continuing without it would mean encrypting with no real key.
 *
 * @returns {Buffer} A 32-byte key derived from the environment secret.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.NXF_API_KEY_SECRET
  if (!secret) throw new Error('NXF_API_KEY_SECRET is not set in environment variables')

  // crypto.createHash('sha256') initialises a SHA-256 hash.
  // .update(secret) feeds the secret string into it.
  // .digest()       finalises the hash and returns the raw bytes as a Buffer.
  return crypto.createHash('sha256').update(secret).digest()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * encryptApiKey
 *
 * Encrypts a plain-text API key string and returns a single storable string
 * that contains everything needed to decrypt it later.
 *
 * Step-by-step walkthrough (useful for novices):
 *
 *  1. Retrieve the 32-byte encryption key from the environment.
 *
 *  2. Generate a random IV (Initialisation Vector).
 *     An IV is a random value that ensures the same plaintext produces a
 *     *different* ciphertext every time you encrypt it. This prevents
 *     attackers from spotting duplicate keys in the database.
 *     For AES-GCM the standard IV size is 96 bits = 12 bytes.
 *
 *  3. Create a cipher object with the algorithm, key, and IV.
 *     Think of this as configuring the "encryption machine" before feeding
 *     data into it.
 *
 *  4. Feed the plain-text key through the cipher in two steps:
 *       cipher.update() → encrypts the main body of data.
 *       cipher.final()  → flushes any remaining bytes and finalises.
 *     Both return Buffers; we concatenate them into one encrypted Buffer.
 *
 *  5. Retrieve the GCM auth tag.
 *     After calling cipher.final(), GCM produces a 16-byte authentication
 *     tag. This tag is a cryptographic "seal": if anyone modifies the stored
 *     ciphertext, the tag will fail verification during decryption, and
 *     Node will throw an error rather than returning garbage data.
 *
 *  6. Encode all three pieces (IV, auth tag, encrypted data) as Base64
 *     strings and join them with ':' separators.
 *     Base64 is used because it converts arbitrary binary bytes into safe
 *     printable ASCII characters, making the result safe to store in any
 *     text field.
 *
 * @param {string} plainKey - The raw API key string to encrypt.
 * @returns {string}          The encrypted result in "iv:authTag:data" format,
 *                            all parts Base64-encoded, joined by colons.
 *
 * @example
 *   const stored = encryptApiKey('sk-live-abc123')
 *   // stored looks like: "dGVzdA==:1a2b3c4d...:ZW5jcnlwdGVk..."
 */
export function encryptApiKey(plainKey: string): string {
  const key = getEncryptionKey()

  // Generate a fresh random 12-byte IV for every encryption call.
  // NEVER reuse an IV with the same key in GCM mode — doing so would
  // completely break the security of the encryption.
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM

  // Initialise the AES-256-GCM cipher with our key and the fresh IV.
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt the plain text. cipher.update() handles the main data,
  // cipher.final() flushes the last block. We concatenate both results.
  const encrypted = Buffer.concat([cipher.update(plainKey, 'utf8'), cipher.final()])

  // Retrieve the 16-byte GCM authentication tag produced after finalisation.
  const authTag = cipher.getAuthTag()

  // Assemble the three components into a single colon-delimited string.
  // All components are Base64-encoded so the result is plain-text safe.
  return [
    iv.toString('base64'),        // Part 1: the IV  (needed to start decryption)
    authTag.toString('base64'),   // Part 2: the tag (needed to verify integrity)
    encrypted.toString('base64'), // Part 3: the ciphertext (the actual encrypted data)
  ].join(':')
}

/**
 * decryptApiKey
 *
 * Reverses the encryption performed by encryptApiKey.
 * Takes the stored "iv:authTag:data" string and returns the original
 * plain-text API key.
 *
 * Step-by-step walkthrough:
 *
 *  1. Retrieve the same 32-byte encryption key from the environment.
 *     AES is symmetric, so the same key used to encrypt is used to decrypt.
 *
 *  2. Split the stored string on ':' to recover the three Base64 parts.
 *
 *  3. Validate that all three parts are present.
 *     If the stored value is corrupted or truncated, we throw early rather
 *     than letting Node.js produce a confusing low-level error.
 *
 *  4. Decode each Base64 part back into a raw binary Buffer.
 *
 *  5. Create a decipher object (the decryption counterpart to the cipher).
 *     We pass in the same algorithm, key, and — crucially — the exact same
 *     IV that was used during encryption.
 *
 *  6. Attach the auth tag to the decipher.
 *     Node.js will automatically verify this tag when cipher.final() is
 *     called. If the ciphertext was tampered with, an error is thrown here.
 *
 *  7. Decrypt and return the original string.
 *     decipher.update() decrypts the main body; decipher.final() flushes
 *     and verifies the auth tag. We concatenate both Buffers and convert
 *     back to a UTF-8 string.
 *
 * @param {string} stored - The encrypted string in "iv:authTag:data" format
 *                          as produced by encryptApiKey.
 * @returns {string}         The original plain-text API key.
 *
 * @throws {Error} If the stored string is missing one or more ':'-separated
 *                 parts (i.e. the format is invalid or the value is corrupt).
 * @throws {Error} If the GCM auth tag verification fails, meaning the
 *                 ciphertext has been tampered with or the wrong key was used.
 *
 * @example
 *   const original = decryptApiKey(stored)
 *   // original === 'sk-live-abc123'
 */
export function decryptApiKey(stored: string): string {
  const key = getEncryptionKey()

  // Split the stored string back into its three Base64 components.
  const [ivB64, tagB64, encB64] = stored.split(':')

  // Guard: all three parts must be present. If any is missing the format is
  // wrong and we cannot proceed safely.
  if (!ivB64 || !tagB64 || !encB64)
    throw new Error('Invalid encrypted key format')

  // Decode each Base64 string back into its original binary Buffer.
  const iv        = Buffer.from(ivB64,  'base64') // The original random IV
  const authTag   = Buffer.from(tagB64, 'base64') // The GCM integrity tag
  const encrypted = Buffer.from(encB64, 'base64') // The ciphertext to decrypt

  // Initialise the AES-256-GCM decipher with the same algorithm, key, and IV
  // that were used during encryption. The IV must match exactly or decryption
  // will produce garbage output (or more likely throw an auth error).
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

  // Provide the auth tag so Node can verify integrity when .final() is called.
  // If the stored ciphertext has been modified in any way, this check will
  // fail and an error will be thrown — protecting against data tampering.
  decipher.setAuthTag(authTag)

  // Decrypt: .update() processes the ciphertext, .final() flushes the last
  // block AND triggers auth-tag verification. Concatenate both into one Buffer
  // then decode the bytes as a UTF-8 string to get the original key back.
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}