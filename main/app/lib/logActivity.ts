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

  if (beacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    // sendBeacon completes even when the tab is closing — fetch does not
    navigator.sendBeacon(
      '/api/activity-log',
      new Blob([payload], { type: 'application/json' }),
    )
    return
  }

  try {
    await fetch('/api/activity-log', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    payload,
    })
  } catch {
    // Silent — activity logging must never crash the caller
  }
}