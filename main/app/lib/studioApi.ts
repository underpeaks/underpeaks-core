/**
 * studioApi.ts
 *
 * Single entry point for all calls from the self-hosted instance
 * to the Underpeaks Studio hosted API.
 *
 * Every phone-home feature — license validation, code generation,
 * AI model generation, template marketplace — routes through this
 * one function. This keeps auth headers, error handling, and the
 * base URL in one place.
 *
 * Currently a stub: if NEXT_PUBLIC_STUDIO_API_URL is not set,
 * calls are logged and mock responses returned so local dev works
 * without a Studio connection.
 */

const STUDIO_API = process.env.NEXT_PUBLIC_STUDIO_API_URL ?? 'https://studio.underpeaks.com'

async function getLicenseKey(): Promise<string> {
  try {
    const { getConfiguredAdapter } = await import('@/app/lib/getConfiguredAdapter ')
    const adapter   = getConfiguredAdapter()
    const dbConfig  = adapter.config
    const allConfig = await adapter.readAll!(dbConfig, 'nxf_system_config')
    const config    = allConfig?.[0]
    return config?.license_key ?? 'self-hosted-dev'
  } catch {
    return 'self-hosted-dev'
  }
}

export async function studioCall(
  endpoint: string,
  payload:  Record<string, unknown>
): Promise<any> {
  const license = await getLicenseKey()

  const headers: Record<string, string> = {
    'Content-Type':   'application/json',
    'X-License-Key':  license,
    'X-NXF-Version':  process.env.NEXT_PUBLIC_NXF_VERSION  ?? '1.0.0',
    'X-NXF-Domain':   process.env.NEXT_PUBLIC_APP_DOMAIN   ?? 'unknown',
  }

  // In dev/stub mode, log and return a mock so local dev never fails
  if (!process.env.NEXT_PUBLIC_STUDIO_API_URL) {
    console.log(`[StudioAPI] STUB call → ${endpoint}`, payload)
    return { success: true, stub: true }
  }

  const res = await fetch(`${STUDIO_API}${endpoint}`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(payload),
  })

  if (res.status === 401) {
    throw new Error('License invalid or expired — visit underpeaks.com to renew')
  }

  if (res.status === 429) {
    throw new Error('Plan limit reached — upgrade to continue at underpeaks.com')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Studio API error ${res.status}: ${text}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Named helpers — add more as Studio endpoints are built
// ---------------------------------------------------------------------------

export async function validateLicense(domain: string) {
  return studioCall('/v1/license/validate', { domain })
}

export async function generateFlutterCode(payload: {
  app_name: string
  theme:    Record<string, unknown>
  models:   unknown[]
  pages:    unknown[]
}) {
  return studioCall('/v1/codegen/flutter', payload)
}

export async function generateNextjsCode(payload: {
  app_name: string
  theme:    Record<string, unknown>
  models:   unknown[]
  pages:    unknown[]
}) {
  return studioCall('/v1/codegen/nextjs', payload)
}

export async function generateModelWithAI(prompt: string) {
  return studioCall('/v1/ai/generate-model', { prompt })
}

export async function generatePageWithAI(prompt: string, models: unknown[]) {
  return studioCall('/v1/ai/generate-page', { prompt, models })
}