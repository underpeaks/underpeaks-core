'use server'

import bcrypt from 'bcryptjs'
import { DBAdapter, DBConfig } from '@/app/db-adapter/types'

interface ResetPasswordInput {
  token: string
  newPassword: string
  adapter: DBAdapter
  config: DBConfig
}

export async function resetPassword({ token, newPassword, adapter, config }: ResetPasswordInput) {
  if (!adapter.findTokenByRefreshToken || !adapter.update) {
    throw new Error('Adapter does not support required functions')
  }

  // 1. Find token
  const tokenRecord = await adapter.findTokenByRefreshToken(token)
  if (!tokenRecord) return { error: 'Invalid or expired token.' }

  if (tokenRecord.revoked) return { error: 'Token has already been used.' }
  if (new Date(tokenRecord.refresh_expires_at).getTime() < Date.now()) {
    return { error: 'Token has expired.' }
  }

  // 2. Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12)

  // 3. Update user password
  await adapter.update(config, 'nxf_users', tokenRecord.user_id, { password_hash: passwordHash })

  // 4. Revoke token
  if (adapter.revokeToken) {
    await adapter.revokeToken(tokenRecord.token_id)
  }

  return { success: true }
}
