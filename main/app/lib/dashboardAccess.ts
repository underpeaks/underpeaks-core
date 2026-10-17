// app/lib/dashboardAccess.ts
import 'server-only'
import { isPlatformTable } from '@/app/lib/platformTables'

/**
 * dashboardAccess.ts
 * Location: app/lib/dashboardAccess.ts
 *
 * Decides which collections and fields the dashboard KPI and chart routes
 * may read. The collection name comes from the browser, so it is checked
 * against an allow-list before it reaches the database:
 *   - the system collections the dashboard offers, and
 *   - models the user created (never platform tables or system models).
 *
 * On nxf_* tables, fields that hold credentials cannot be used for a filter,
 * a sum or a date, so a KPI cannot be used to guess a password hash or token.
 *
 * NOTE: SYSTEM_COLLECTION_KEYS mirrors SYSTEM_COLLECTIONS in
 * app/api/dashboard/collections/route.ts — keep the two in sync.
 */

export const SYSTEM_COLLECTION_KEYS = new Set<string>([
  'nxf_users',
  'nxf_pages',
  'nxf_system_models',
  'nxf_menu',
  'nxf_menus',
  'nxf_storage',
  'nxf_system_activity_logs',
  'nxf_themes',
])

const SENSITIVE_FIELD = /password|token|secret|hash|api_?key|license|private/i

/** True when the collection may be used by the dashboard. */
export async function isAllowedCollection(
  adapter: any,
  dbConfig: any,
  collection: unknown,
): Promise<boolean> {
  if (typeof collection !== 'string' || !collection) return false
  if (SYSTEM_COLLECTION_KEYS.has(collection)) return true

  try {
    const models = await adapter.readAll!(dbConfig, 'nxf_system_models')
    return (models ?? []).some((m: any) => {
      const key = m.collection_name ?? m.name
      return key === collection && !m.is_system && !isPlatformTable(key)
    })
  } catch {
    return false
  }
}

/**
 * True when every given field may be used on this collection. On nxf_* tables
 * credential-like fields are refused; on user models any field is fine.
 */
export function areFieldsAllowed(collection: string, fields: Array<unknown>): boolean {
  if (!collection.startsWith('nxf_')) return true
  return fields.every(
    (f) => f === undefined || f === null || f === '' ||
           (typeof f === 'string' && !SENSITIVE_FIELD.test(f)),
  )
}