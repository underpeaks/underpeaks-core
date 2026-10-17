// app/lib/logActivity.ts

import { authHeader } from '@/app/lib/clientAuth'

/**
 * logActivity
 *
 * Client-side helper for POST /api/activity-log.
 * Import this anywhere you want to track an action.
 *
 * Normal usage (await-able):
 *   await logActivity(userId, 'model_created', { model_name: 'Product' })
 *
 * On browser close (beforeunload) — pass beacon: true:
 *   logActivity(userId, 'user_offline', {}, true)
 *
 * Both paths send the Authorization header. With beacon: true the request
 * uses fetch with keepalive, which finishes while the page is closing like
 * sendBeacon did, but can carry the token.
 *
 * Never throws — logging is always best-effort and will never
 * crash the caller if the request fails.
 */
export async function logActivity(
  user_id: string,
  action:  string,
  context: Record<string, any> = {},
  beacon  = false,
): Promise<void> {
  if (!user_id || !action) return

  const payload = JSON.stringify({ user_id, action, context })

  try {
    await fetch('/api/activity-log', {
      method:    'POST',
      keepalive: beacon,
      headers:   { 'Content-Type': 'application/json', ...authHeader() },
      body:      payload,
    })
  } catch {
    // Silent — activity logging must never crash the caller
  }
}