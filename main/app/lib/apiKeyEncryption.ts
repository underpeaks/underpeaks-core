import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32

function getEncryptionKey(): Buffer {
  const secret = process.env.NXF_API_KEY_SECRET
  if (!secret) throw new Error('NXF_API_KEY_SECRET is not set in environment variables')
  // Derive a 32-byte key from the secret using SHA-256
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptApiKey(plainKey: string): string {
  const key = getEncryptionKey()
  const iv  = crypto.randomBytes(12) // 96-bit IV for GCM

  const cipher     = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted  = Buffer.concat([cipher.update(plainKey, 'utf8'), cipher.final()])
  const authTag    = cipher.getAuthTag()

  // Store as iv:authTag:encrypted — all base64
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptApiKey(stored: string): string {
  const key               = getEncryptionKey()
  const [ivB64, tagB64, encB64] = stored.split(':')

  if (!ivB64 || !tagB64 || !encB64)
    throw new Error('Invalid encrypted key format')

  const iv        = Buffer.from(ivB64,  'base64')
  const authTag   = Buffer.from(tagB64, 'base64')
  const encrypted = Buffer.from(encB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}