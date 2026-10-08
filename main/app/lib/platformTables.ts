// app/lib/platformTables.ts
import 'server-only'
import fs   from 'fs'
import path from 'path'

/**
 * Platform tables are the tables created by the installer from the schema files
 * in shared_models (system, users and the blank project type). They are
 * protected from deletion and from being re-created as user models.
 * Any other name — including names that start with nxf_ — is a normal model.
 */
const DIRS = ['system_models', 'users_models', 'blank_models'].map((d) =>
  path.resolve(process.cwd(), '../shared_models', d)
)

let cache: Set<string> | null = null

export function getPlatformTables(): Set<string> {
  if (cache) return cache

  const set = new Set<string>()
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      try {
        const json = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))
        if (json.table_name) set.add(String(json.table_name).toLowerCase())
      } catch {
        // unreadable schema file: ignore
      }
    }
  }

  cache = set
  return set
}

/** True for nxf_system_* and for every table the installer creates. */
export function isPlatformTable(name: string): boolean {
  const n = name.toLowerCase()
  return n.startsWith('nxf_system_') || getPlatformTables().has(n)
}