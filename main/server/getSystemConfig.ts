/**
 * getSystemConfig Utility
 *
 * This file provides a single utility function that reads a project-level
 * configuration file (nxt_flutter.config.json) and returns key branding
 * values such as the favicon URL, logo URL, and project name.
 *
 * It is used to allow each deployment (or client project) to customise
 * the app's branding without changing any source code — just by editing
 * the config file at the root of the project.
 *
 * Where this is typically used:
 * - Layout files that need to display the correct logo or favicon.
 * - Any server-side code that needs to know the current project's name.
 *
 * Config file location:
 *   <project-root>/nxt_flutter.config.json
 *
 * Expected shape of nxt_flutter.config.json:
 * {
 *   "faviconUrl":   "/images/favicon/my-favicon.png",
 *   "logoUrl":      "/images/logo/my-logo.png",
 *   "projectName":  "My Project"
 * }
 *
 * If the file is missing, unreadable, or a field is absent, safe fallback
 * values pointing to the default NXT Flutter assets are used instead, so
 * the app never crashes just because of a missing config file.
 */

import { readFileSync } from 'fs'
import { join }         from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * SystemConfig
 *
 * Describes the shape of the object returned by getSystemConfig().
 *
 * @property faviconUrl   - The URL (relative or absolute) to the favicon image.
 *                          Used in the <head> of the HTML document.
 * @property logoUrl      - The URL (relative or absolute) to the project logo.
 *                          Typically displayed in the navigation bar or header.
 * @property projectName  - A human-readable name for the current project/client.
 *                          Can be used in page titles or headings.
 */
interface SystemConfig {
  faviconUrl:  string
  logoUrl:     string
  projectName: string
}

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * getSystemConfig
 *
 * Reads the `nxt_flutter.config.json` file from the root of the project
 * and returns the branding configuration values found inside it.
 *
 * This function is designed to be called on the **server side only**
 * (e.g. in Next.js Server Components, layout.tsx, or API routes), because
 * it uses Node.js `fs.readFileSync` which is not available in the browser.
 *
 * How it works:
 * 1. Builds the full path to the config file using `process.cwd()`, which
 *    always points to the root of the running Next.js project.
 * 2. Reads and parses the JSON file synchronously.
 * 3. Returns the three branding fields from the parsed config.
 * 4. If any field is missing (null / undefined / empty), a safe default
 *    value is used instead via the `||` (OR) operator.
 * 5. If the file cannot be read at all (e.g. it doesn't exist, or the JSON
 *    is malformed), the catch block silently returns all three defaults so
 *    the rest of the app continues to work normally.
 *
 * @returns {SystemConfig} An object containing `faviconUrl`, `logoUrl`,
 *                         and `projectName`. Always returns a complete object
 *                         — never throws.
 *
 * @example
 * // In a Next.js Server Component or layout file:
 * const { faviconUrl, logoUrl, projectName } = getSystemConfig()
 */
export function getSystemConfig(): SystemConfig {
  try {
    /*
     * Build the absolute path to the config file.
     *
     * `process.cwd()` returns the directory where the Next.js process was
     * started — this is always the project root (the folder that contains
     * package.json). `join` then appends the filename to that path in a
     * cross-platform safe way (handles Windows vs Unix path separators).
     */
    const filePath = join(process.cwd(), 'nxt_flutter.config.json')

    /*
     * Read the file from disk and parse it as JSON.
     *
     * `readFileSync` blocks (waits) until the file is fully read. This is
     * acceptable here because this function is only called during server-side
     * rendering, not inside a hot user-facing request loop.
     *
     * 'utf-8' tells Node.js to decode the raw bytes as a text string so that
     * JSON.parse can process it.
     */
    const config = JSON.parse(readFileSync(filePath, 'utf-8'))

    /*
     * Return the three branding values from the config.
     *
     * The `||` operator means: "use the config value if it is truthy
     * (non-empty string), otherwise fall back to the default string".
     * This guards against fields that exist in the file but are set to
     * empty strings or null.
     */
    return {
      faviconUrl:  config?.faviconUrl  || '/images/favicon/NXT_Flutter_favicon.png',
      logoUrl:     config?.logoUrl     || '/images/logo/NXT_Flutter_logo.png',
      projectName: config?.projectName || '',
    }
  } catch (err) {
    /*
     * If anything goes wrong above (file not found, invalid JSON, permission
     * error, etc.), we silently catch the error and return the default values.
     *
     * This is intentional — a missing config file should not crash the app.
     * The defaults ensure the app still renders with the built-in NXT Flutter
     * branding until a proper config file is provided.
     */
    return {
      faviconUrl:  '/images/favicon/NXT_Flutter_favicon.png',
      logoUrl:     '/images/logo/NXT_Flutter_logo.png',
      projectName: '',
    }
  }
}