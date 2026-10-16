// File: app/lib/customerAuthCore.ts

import 'server-only'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { getConfiguredAdapter } from '@/app/lib/getConfiguredAdapter'
import { signJwt } from '@/app/lib/jwt'

export function coreCors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Customer-Token',
  }
}

export function safeCustomer(row: any): Record<string, unknown> {
  const { password_hash, token, token_ttl, notes, ...safe } = row
  return safe
}

/**
 * Verify a customer access token.
 *  - the secret is read when called (not at import) and must be set;
 *  - only HS256 is accepted;
 *  - the token must be a customer token — a token of any other kind that
 *    happens to share the secret is rejected here, not left to each route.
 */
export function verifyAccessToken(token: string): any {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set')

  const decoded: any = jwt.verify(token, secret, { algorithms: ['HS256'] })
  if (decoded?.user_type !== 'customer') throw new Error('Not a customer token')
  return decoded
}

export async function issueCoreCustomerToken(input: {
  userId:    string
  tenantId:  string
  projectId: string
}): Promise<{ token: string; refreshToken: string }> {
  const adapter  = getConfiguredAdapter()
  const dbConfig = adapter.config

  const payload = {
    sub:        input.userId,
    user_id:    input.userId,
    tenant_id:  input.tenantId,
    project_id: input.projectId,
    user_type:  'customer',
  }

  const token        = signJwt(payload, { expiresIn: '7d' })
  const refreshToken = crypto.randomUUID()
  const now = new Date()

  await (adapter as any).create(dbConfig, 'nxf_system_tokens', {
    token_id:           crypto.randomUUID(),
    user_id:            input.userId,
    tenant_id:          input.tenantId,
    project_id:         input.projectId,
    access_token:       token,
    refresh_token:      refreshToken,
    token_type:         'bearer',
    expires_at:         new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    refresh_expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    revoked:            false,
    created_at:         now,
    updated_at:         now,
  })

  return { token, refreshToken }
}