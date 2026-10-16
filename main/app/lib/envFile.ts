// app/lib/envFile.ts
//
// One safe way to write values into .env.local.

import 'server-only'
import fs   from 'fs'
import path from 'path'

/**
 * Format a value for a .env line.
 *  - null/undefined → ""
 *  - numbers        → bare number
 *  - strings        → double-quoted, " escaped (as before), and $ escaped so
 *                     Next's variable expansion leaves it alone.
 * Throws on a raw newline, carriage return or NUL: one of those would let
 * the value start a new line and set any variable.
 */
export function envSafe(value: any): string {
  if (value === undefined || value === null) return '""'
  if (typeof value === 'number') return String(value)
  const str = String(value)
  if (/[\r\n\0]/.test(str)) throw new Error('Invalid characters in value')
  return `"${str.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`
}

/**
 * Set or replace KEY="value" lines in .env.local.
 * Keys must look like env names; values go through envSafe.
 */
export function patchEnvFile(updates: Record<string, string>): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  let content   = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : ''

  for (const [key, value] of Object.entries(updates)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error('Invalid env key')
    const line  = `${key}=${envSafe(value)}`
    const regex = new RegExp(`^${key}=.*$`, 'm')
    content = regex.test(content)
      ? content.replace(regex, () => line)              // function: no $-pattern surprises
      : content.replace(/\n*$/, '\n') + line + '\n'
  }

  fs.writeFileSync(envPath, content, 'utf-8')
}