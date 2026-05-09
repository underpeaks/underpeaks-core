'use server'

import crypto from 'crypto'
import { DBAdapter, DBConfig } from '@/app/db-adapter/types'

interface ForgotPasswordInput {
  email: string
  adapter: DBAdapter
  config: DBConfig
}

export async function forgotPassword({ email, adapter, config }: ForgotPasswordInput) {
  if (!adapter.findUserByEmail || !adapter.createToken) {
    throw new Error('Adapter does not support required functions')
  }

  // 1. Find user by email
  const user = await adapter.findUserByEmail(config, email)
  if (!user) return { error: 'No account found with that email.' }

  // 2. Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry

  // 3. Store reset token in nxf_system_tokens (using refresh_token_hash)
  await adapter.createToken({
    token_id: crypto.randomUUID(),
    user_id: user.user_id,
    project_id: '', // optional
    access_token_hash: '',
    refresh_token_hash: resetToken,
    access_expires_at: new Date(),
    refresh_expires_at: expiresAt,
    revoked: false,
    ip_address: null,
    user_agent: null,
    created_at: new Date(),
    updated_at: new Date(),
  })

  // 4. TODO: send email with reset link
  return { success: true, resetToken } // for testing; in prod, email instead
}
