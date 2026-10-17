// app/lib/safeFetch.ts
import 'server-only'

/**
 * safeFetch — download a remote URL without letting it reach your own network.
 *
 * - http/https only, ports 80 and 443 only, no user:pass@ in the URL.
 * - The host is resolved first; if ANY address is private / loopback /
 *   link-local / cloud-metadata, the request is refused.
 * - The connection is pinned to the address that was checked (a hostname that
 *   changes its answer between the check and the connect cannot get through).
 * - Redirects are followed by hand (max 3) and every hop is checked again.
 * - Body is read as a stream and cut off at maxBytes; 15 s timeout.
 *
 * Self-hosters who really need to import from their own LAN can set
 * NXF_IMPORT_ALLOW_PRIVATE=true in .env.local.
 */

import dns   from 'dns/promises'
import net   from 'net'
import http  from 'http'
import https from 'https'

export class SafeFetchError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

// ── Blocked address ranges ──────────────────────────────────────────────────

const blocked = new net.BlockList()

const V4: Array<[string, number]> = [
  ['0.0.0.0', 8],      ['10.0.0.0', 8],      ['100.64.0.0', 10],
  ['127.0.0.0', 8],    ['169.254.0.0', 16],  ['172.16.0.0', 12],
  ['192.0.0.0', 24],   ['192.0.2.0', 24],    ['192.168.0.0', 16],
  ['198.18.0.0', 15],  ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4],    ['240.0.0.0', 4],
]
for (const [addr, prefix] of V4) blocked.addSubnet(addr, prefix, 'ipv4')

const V6: Array<[string, number]> = [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10],
  ['ff00::', 8], ['2001:db8::', 32], ['64:ff9b::', 96],
]
for (const [addr, prefix] of V6) blocked.addSubnet(addr, prefix, 'ipv6')

function isBlockedAddress(address: string): boolean {
  let a = address.toLowerCase()

  // IPv4-mapped IPv6, dotted form (::ffff:127.0.0.1)
  const dotted = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) a = dotted[1]

  // IPv4-mapped IPv6, hex form (::ffff:7f00:1) — what URL() produces for [::ffff:127.0.0.1]
  const hex = a.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hex) {
    const hi = parseInt(hex[1], 16)
    const lo = parseInt(hex[2], 16)
    a = `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`
  }

  const family = net.isIPv4(a) ? 'ipv4' : net.isIPv6(a) ? 'ipv6' : null
  if (!family) return true // not an IP at all: refuse
  return blocked.check(a, family)
}

// ── URL + host checks ───────────────────────────────────────────────────────

function parseUrl(raw: string): URL {
  let url: URL
  try { url = new URL(raw) } catch { throw new SafeFetchError('Invalid URL') }

  if (url.protocol !== 'http:' && url.protocol !== 'https:')
    throw new SafeFetchError('Only http and https URLs are allowed')
  if (url.username || url.password)
    throw new SafeFetchError('URLs with credentials are not allowed')
  if (url.port && url.port !== '80' && url.port !== '443')
    throw new SafeFetchError('Only the standard web ports are allowed')

  return url
}

async function resolveAndCheck(url: URL): Promise<{ address: string; family: number }> {
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const allowPrivate = process.env.NXF_IMPORT_ALLOW_PRIVATE === 'true'

  let addrs: Array<{ address: string; family: number }>
  const literal = net.isIP(host)

  if (literal) {
    addrs = [{ address: host, family: literal }]
  } else {
    try {
      addrs = await dns.lookup(host, { all: true, verbatim: true })
    } catch {
      throw new SafeFetchError('Could not resolve that host')
    }
  }

  if (!addrs.length) throw new SafeFetchError('Could not resolve that host')

  if (!allowPrivate && addrs.some((a) => isBlockedAddress(a.address)))
    throw new SafeFetchError('That address is not allowed')

  return addrs[0]
}

// ── One pinned request ──────────────────────────────────────────────────────

type Hop = { status: number; headers: http.IncomingHttpHeaders; body: Buffer }

function pinnedRequest(
  url: URL, address: string, family: number, maxBytes: number, timeoutMs: number,
): Promise<Hop> {
  return new Promise<Hop>((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http

    const req = lib.request(
      {
        method:   'GET',
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        port:     url.port || undefined,
        path:     `${url.pathname}${url.search}`,
        headers:  { 'User-Agent': 'Underpeaks-Importer/1.0', Accept: '*/*' },
        timeout:  timeoutMs,
        // Connect to the address we already checked, not to a fresh DNS answer.
        lookup: ((_h: string, opts: any, cb: any) =>
          opts?.all ? cb(null, [{ address, family }]) : cb(null, address, family)) as any,
      } as any,
      (res) => {
        const status = res.statusCode ?? 0

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume()
          resolve({ status, headers: res.headers, body: Buffer.alloc(0) })
          return
        }

        const declared = Number(res.headers['content-length'] ?? 0)
        if (declared > maxBytes) {
          res.destroy()
          reject(new SafeFetchError('File is too large', 413))
          return
        }

        const chunks: Buffer[] = []
        let total = 0

        res.on('data', (chunk: Buffer) => {
          total += chunk.length
          if (total > maxBytes) {
            res.destroy()
            reject(new SafeFetchError('File is too large', 413))
            return
          }
          chunks.push(chunk)
        })
        res.on('end',   () => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }))
        res.on('error', () => reject(new SafeFetchError('Download failed', 502)))
      },
    )

    req.on('timeout', () => { req.destroy(); reject(new SafeFetchError('Download timed out', 504)) })
    req.on('error',   () => reject(new SafeFetchError('Could not download that URL', 502)))
    req.end()
  })
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function safeFetch(
  rawUrl: string,
  opts: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {},
): Promise<{ buffer: Buffer; contentType: string; finalUrl: URL }> {
  const maxBytes     = opts.maxBytes     ?? 25 * 1024 * 1024
  const timeoutMs    = opts.timeoutMs    ?? 15_000
  const maxRedirects = opts.maxRedirects ?? 3

  let url = parseUrl(rawUrl)

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const { address, family } = await resolveAndCheck(url)
    const res = await pinnedRequest(url, address, family, maxBytes, timeoutMs)

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      url = parseUrl(new URL(res.headers.location, url).toString())
      continue
    }

    if (res.status < 200 || res.status >= 300)
      throw new SafeFetchError(`The remote server answered ${res.status}`)

    const contentType = String(res.headers['content-type'] ?? 'application/octet-stream')
      .split(';')[0].trim().toLowerCase()

    return { buffer: res.body, contentType, finalUrl: url }
  }

  throw new SafeFetchError('Too many redirects')
}