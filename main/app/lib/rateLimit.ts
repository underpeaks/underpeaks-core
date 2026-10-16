// app/lib/rateLimit.ts
//
// Small in-memory rate limiter for the public auth routes.
// Per server process: with several instances each keeps its own counts, which
// still stops floods and brute force on a normal single-server install.

const buckets = new Map<string, { count: number; resetAt: number }>()

/** Best-effort client IP (first X-Forwarded-For entry when behind a proxy). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Count one hit for `key`. Returns ok=false once `limit` hits have happened
 * inside the window, with the seconds until the window resets.
 */
export function rateLimit(
  key:      string,
  limit:    number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now()

  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
  }

  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  b.count += 1
  if (b.count > limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}