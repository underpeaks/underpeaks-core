// app/lib/getSessionUser.ts
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getConfiguredAdapter }      from '@/app/lib/getConfiguredAdapter'

/**
 * getSessionUser.ts
 * Location: app/lib/getSessionUser.ts
 *
 * Server-side: works out WHO is calling from the Bearer token, so routes never
 * have to trust a user_id sent by the browser.
 *
 *   Firebase / Supabase (supportsBuiltInAuth): token is verified by the adapter.
 *     Firebase returns the user id as `uid`, Supabase as `id`.
 *   Postgres / MySQL / MongoDB: token is looked up in
 *     nxf_system_tokens and must not be revoked.
 *
 * The token must belong to a CONSOLE user (a row in nxf_users that is not a
 * customer account). Customer tokens are stored in the same tokens table,
 * so without this check a customer's token would work as a console token.
 *
 * The status is compared case-insensitively: some databases store 'Active',
 * others 'active'.
 *
 * Every refusal logs the reason (never the token) so a 401 can be traced.
 *
 * NOTE: expires_at is not checked yet (same as the existing routes) - adding
 * it needs a per-adapter timezone check first. Tracked separately.
 *
 * Usage in a route:
 *
 *   const session = await requireSessionUser(req)
 *   if (!session.ok) return session.response
 *   const userId = session.userId
 */

export interface SessionUser {
  userId: string
  token:  string
}

/** Returns the signed-in console user, or null if there is no valid token. */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const authHeader = req.headers.get('Authorization')
  const token      = authHeader?.replace('Bearer ', '').trim() || null

  if (!token) {
    console.warn('[session] refused: no Bearer token on', req.nextUrl?.pathname)
    return null
  }

  try {
    const adapter  = getConfiguredAdapter()
    const dbConfig = adapter.config

    let uid: string | null = null

    if (adapter.supportsBuiltInAuth) {
      const decoded: any = await adapter.validateBuiltInSession?.(dbConfig, token)
      // Firebase: uid. Supabase: id. Some adapters: user_id.
      uid = decoded?.uid ?? decoded?.user_id ?? decoded?.id ?? null
    } else {
      if (!adapter.findTokenByAccessToken) {
        console.warn('[session] refused: adapter has no findTokenByAccessToken')
        return null
      }
      const storedToken = await adapter.findTokenByAccessToken(token)
      if (!storedToken) {
        console.warn('[session] refused: token not found in tokens table')
        return null
      }
      if (storedToken.revoked) {
        console.warn('[session] refused: token is revoked')
        return null
      }
      uid = storedToken.user_id ?? null
    }

    if (!uid) {
      console.warn('[session] refused: token has no user id')
      return null
    }

    // Must be a console user: present in nxf_users and not a customer.
    const users  = (await adapter.readAll!(dbConfig, 'nxf_users')) as any[]
    const person = users.find((u) => u.user_id === uid)

    if (!person) {
      console.warn('[session] refused: user', uid, 'not found in nxf_users (rows read:', users.length + ')')
      return null
    }
    if (person.user_type === 'customer' || person.role === 'customer') {
      console.warn('[session] refused: user', uid, 'is a customer account')
      return null
    }
    if (person.status && String(person.status).toLowerCase() !== 'active') {
      console.warn('[session] refused: user', uid, 'status is', person.status)
      return null
    }

    return { userId: uid, token }
  } catch (err: any) {
    console.error('[session] refused: error while checking token:', err?.message)
    return null
  }
}

/**
 * Same as getSessionUser, but hands back a ready 401 response when the caller
 * is not signed in, so a route needs only two lines.
 */
export async function requireSessionUser(
  req: NextRequest
): Promise<
  | { ok: true;  userId: string; token: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getSessionUser(req)

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { ok: true, userId: session.userId, token: session.token }
}