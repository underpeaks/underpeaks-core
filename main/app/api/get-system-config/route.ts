// app/api/system-config/route.ts

/**
 * GET /api/system-config
 *
 * Next.js App Router API route that exposes a small subset of the server-side
 * system configuration to the client at runtime.
 *
 * Why does this route exist?
 * ──────────────────────────
 * Some system configuration values (favicon URL, project name, logo URL) are
 * needed by client components (e.g. the top navbar, browser tab title) but
 * originate on the server via getSystemConfig(). Rather than embedding them
 * in the build output or duplicating them in client-side environment variables,
 * this route acts as a thin, controlled gateway — client components fetch it
 * once at runtime to get the values they need.
 *
 * What is getSystemConfig()?
 * ───────────────────────────
 * getSystemConfig() is a server-side utility that reads the project's runtime
 * configuration (from environment variables, a config file, or the database
 * depending on the implementation). See server/getSystemConfig.ts for details.
 *
 * Why only these three fields?
 * ─────────────────────────────
 * The full config object may contain sensitive server-side values (database
 * credentials, API keys, etc.) that must never be sent to the browser. This
 * route explicitly picks only the three safe, UI-facing fields and returns
 * them — nothing else. This is an intentional allow-list pattern.
 *
 * No request body or query parameters are needed — this is a static read.
 *
 * Responses:
 * ──────────
 *   200 { faviconUrl, projectName, logoUrl } — The three UI config values.
 *
 * Note: This route does not return error responses because getSystemConfig()
 * is expected to always succeed (it reads from the server environment which
 * is set up at deploy time). If it throws, Next.js will return a default 500.
 */

import { getSystemConfig } from '@/server/getSystemConfig'

/**
 * PublicSystemConfig
 *
 * The shape of the JSON body returned by this route.
 * Contains only the UI-facing subset of the full system configuration —
 * safe to expose to the browser.
 *
 * Fields:
 *   - faviconUrl  {string} — URL of the project's favicon image.
 *   - projectName {string} — The display name of the project, shown in the
 *                            navbar and browser tab.
 *   - logoUrl     {string} — URL of the project's logo image, shown in the
 *                            navbar and on the login screen.
 */
interface PublicSystemConfig {
  faviconUrl:  string
  projectName: string
  logoUrl:     string
  installed:   boolean
}

/**
 * GET
 *
 * Handles GET requests to /api/system-config.
 * Reads the server-side system config and returns the three safe UI fields.
 *
 * @returns A Response containing a {@link PublicSystemConfig} JSON object.
 */
export async function GET(): Promise<Response> {
  /**
   * Read the full server-side system configuration.
   * Only a safe subset of fields is returned to the client — see
   * PublicSystemConfig above for the rationale.
   */
  const config = getSystemConfig()

  /**
   * Explicitly pick only the three UI-safe fields from the config object.
   * Do NOT spread the full config here — other fields may be sensitive.
   */
  return Response.json({
    faviconUrl:  config.faviconUrl,
    projectName: config.projectName,
    logoUrl:     config.logoUrl,
     installed:   config.installed ?? false,
  } satisfies PublicSystemConfig)
}