// app/lib/assertCanSignIn.ts

/**
 * Console access rule: only these roles may sign in to the Core console.
 * Change the list here and every route that uses it follows.
 */
const ALLOWED_ROLES = ['admin']

export const NO_CONSOLE_ACCESS_MESSAGE =
  'Your account does not have access to the console. Please contact your administrator.'

export function canSignIn(role?: string | null): boolean {
  return ALLOWED_ROLES.includes(String(role ?? '').trim().toLowerCase())
}

/**
 * Reads a user's role from nxf_users through the adapter (works on all five
 * databases). Returns null if the user or role can't be read, so callers
 * fail closed.
 */
export async function lookupRole(
  adapter: any,
  dbConfig: any,
  userId?: string | null
): Promise<string | null> {
  if (!userId) return null

  try {
    const all = await adapter.readAll(dbConfig, 'nxf_users')
    const row = (all ?? []).find((u: any) => u.user_id === userId)
    return row?.role ?? null
  } catch {
    console.error('[assertCanSignIn] Could not read nxf_users to check role')
    return null
  }
}