/**
 * Schema Table Creation Utilities
 *
 * This module is responsible for reading JSON schema definition files from
 * disk and creating the corresponding tables in the target database.
 *
 * It is used during the initial setup phase of a project to ensure the
 * required database structure exists before any application logic runs.
 *
 * ─── What this module exports ─────────────────────────────────────────────
 *
 * createSystemTables(config)
 *   Creates the core system-level tables that every project needs
 *   (tenants, users, projects, environments). These tables are always
 *   created in a specific order to satisfy foreign key dependencies.
 *
 * createUsersTables(config)
 *   Creates the user-related tables from the users_models directory.
 *
 * createAdminUser(config, data)
 *   Delegates to the adapter's `createAdminUser` method to insert the
 *   initial admin user record into the database.
 *
 * ─── Internal helpers (not exported) ──────────────────────────────────────
 *
 * normalizeColumns(columns)
 *   Converts a column definition from either array or object format into
 *   a consistent ColumnDef array that the rest of the system can rely on.
 *
 * normalizeSchema(files)
 *   Reads a list of JSON files and builds a lookup map of
 *   table_name → normalized schema definition.
 *
 * loadSchemasFromDir(dir)
 *   Reads all JSON files from a directory and returns a normalized schema map.
 *
 * createTables(config, dir, preferredOrder)
 *   Core logic: loads schemas from a directory and calls adapter.createTable
 *   for each one, respecting the preferred creation order.
 */

import fs from 'fs';
import path from 'path';
import { DBConfig, ColumnDef } from '../types';
import { getAdapter } from '../index';

// ---------------------------------------------------------------------------
// Directory constants
// ---------------------------------------------------------------------------

/**
 * SYSTEM_SCHEMA_DIR
 * Path to the directory containing core system table schema JSON files.
 * These are tables every project requires regardless of type.
 * Example tables: nxf_system_tenants, nxf_users, nxf_system_projects.
 */
const SYSTEM_SCHEMA_DIR = path.resolve(
  process.cwd(),
  '../shared_models/system_models'
);

/**
 * USER_SCHEMA_DIR
 * Path to the directory containing user-related table schema JSON files.
 */
const USER_SCHEMA_DIR = path.resolve(
  process.cwd(),
  '../shared_models/users_models'
);

// ---------------------------------------------------------------------------
// Helper: normalizeColumns
// ---------------------------------------------------------------------------

/**
 * normalizeColumns
 *
 * JSON schema files can define columns in two formats:
 *
 * Format A — Array (already normalized):
 *   "columns": [{ "name": "id", "type": "uuid", "is_primary": true }, ...]
 *
 * Format B — Object (key = column name, value = definition):
 *   "columns": { "id": { "type": "uuid", "is_primary": true }, ... }
 *
 * This function accepts either format and always returns a ColumnDef array,
 * so the rest of the codebase never needs to handle both shapes.
 *
 * @param columns - Raw column data from a parsed JSON schema file.
 * @returns       - A consistent ColumnDef array.
 */
function normalizeColumns(columns: any): ColumnDef[] {
  if (Array.isArray(columns)) return columns;

  return Object.entries(columns).map(([name, def]: [string, any]) => ({
    name,
    type:        def.type,
    is_primary:  def.is_primary ?? def.primary_key ?? false,
    unique:      def.unique     ?? false,
    nullable:    def.nullable   ?? true,
    default:     def.default,
    foreign_key: def.foreign_key,
  }));
}

// ---------------------------------------------------------------------------
// Helper: normalizeSchema
// ---------------------------------------------------------------------------

/**
 * normalizeSchema
 *
 * Takes a list of absolute file paths to JSON schema files, reads and parses
 * each one, and returns a lookup map of:
 *   { [table_name]: normalized schema definition }
 *
 * Files that do not contain a `table_name` field are silently skipped,
 * since they cannot be associated with a database table.
 *
 * @param files - Array of absolute paths to JSON schema files.
 * @returns     - A map of table names to their full normalized schema objects.
 */
function normalizeSchema(files: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const f of files) {
    const content = JSON.parse(fs.readFileSync(f, 'utf-8'));

    if (content.table_name) {
      const normalizedCols = normalizeColumns(content.columns);
      result[content.table_name] = { ...content, columns: normalizedCols };
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helper: loadSchemasFromDir
// ---------------------------------------------------------------------------

/**
 * loadSchemasFromDir
 *
 * Reads all `.json` files from the given directory, parses them, and returns
 * a normalized schema map (table_name → schema definition).
 *
 * Throws immediately if the directory does not exist, since this almost always
 * indicates a misconfigured path that needs developer attention.
 *
 * @param dir - Absolute path to a directory containing JSON schema files.
 * @returns   - Normalized schema map for all valid JSON files in the directory.
 *
 * @throws If the directory does not exist on disk.
 */
function loadSchemasFromDir(dir: string): Record<string, any> {
  if (!fs.existsSync(dir)) {
    throw new Error(`Schema directory not found: ${dir}`);
  }

  const schemaFiles = fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(dir, f));

  return normalizeSchema(schemaFiles);
}

// ---------------------------------------------------------------------------
// Core: createTables
// ---------------------------------------------------------------------------

/**
 * createTables
 *
 * The internal workhorse of this module. Given a DB config and a directory
 * of JSON schema files, it creates all the corresponding tables in the
 * target database using the appropriate adapter.
 *
 * ─── Ordering ─────────────────────────────────────────────────────────────
 * Relational databases require that a referenced (parent) table exists before
 * a table with a foreign key to it is created. The `preferredOrder` parameter
 * lets the caller specify which tables must come first.
 *
 * Tables not listed in `preferredOrder` are created after in the order they
 * appear in the schema directory.
 *
 * ─── Adapter guard ────────────────────────────────────────────────────────
 * Not all adapters implement `createTable` (e.g. a read-only analytics
 * adapter). If the method is missing, a warning is logged and the function
 * returns early rather than throwing, since this may be intentional.
 *
 * @param config         - DB connection config including the adapter type.
 * @param dir            - Directory of JSON schema files to process.
 * @param preferredOrder - Table names that must be created first, in order.
 *                         Tables not listed here are created afterward.
 *
 * @throws If `config.type` is missing.
 */
async function createTables(
  config: DBConfig,
  dir: string,
  preferredOrder: string[] = []
) {
  if (!config?.type) throw new Error('Missing DB config/type');

  const adapter = getAdapter(config.type, config);

  /**
   * If the adapter does not implement `createTable`, log a warning and exit.
   * This is a non-fatal condition — some adapters are intentionally read-only.
   */
  if (!adapter?.createTable) {
    console.warn(`[${config.type}] createTable not implemented, skipping table creation`);
    return;
  }

  const schemaJSON = loadSchemasFromDir(dir);

  /**
   * Build the final ordered list of tables:
   * 1. Tables from `preferredOrder` that actually exist in the schema map.
   * 2. All remaining tables not already covered by `preferredOrder`.
   *
   * This two-pass approach guarantees FK parent tables are created first
   * while still processing every table in the schema directory.
   */
  const ordered = [
    ...preferredOrder.filter(t => schemaJSON[t]),
    ...Object.keys(schemaJSON).filter(t => !preferredOrder.includes(t)),
  ];

  for (const tableName of ordered) {
    const tableDef = schemaJSON[tableName];
    if (!tableDef) continue;

    console.log(`[${config.type}] Creating table:`, tableName);
    await adapter.createTable!(tableName, tableDef);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * createSystemTables
 *
 * Creates all core system tables required by every project.
 * The `foundationOrder` array ensures tables are created in the correct
 * sequence to satisfy foreign key constraints between them:
 *   1. nxf_system_tenants     — must exist before anything that references it.
 *   2. nxf_users              — depends on tenants.
 *   3. nxf_system_projects    — depends on users and tenants.
 *   4. nxf_system_environments — depends on projects.
 *
 * @param config - DB connection configuration.
 */
export async function createSystemTables(config: DBConfig) {
  const foundationOrder = [
    'nxf_system_tenants',
    'nxf_users',
    'nxf_system_projects',
    'nxf_system_environments',
  ];

  await createTables(config, SYSTEM_SCHEMA_DIR, foundationOrder);
}

/**
 * createUsersTables
 *
 * Creates all user-related tables from the users_models schema directory.
 * No preferred order is enforced — tables are created in directory order.
 *
 * @param config - DB connection configuration.
 */
export async function createUsersTables(config: DBConfig) {
  await createTables(config, USER_SCHEMA_DIR);
}

/**
 * createAdminUser
 *
 * Delegates to the adapter's `createAdminUser` method to insert the initial
 * admin user record into the database.
 *
 * This is a thin pass-through that validates the adapter supports the
 * operation before calling it, providing a clear error if it does not.
 *
 * @param config - DB connection configuration.
 * @param data   - The admin user data to insert (email, password hash, role, etc.)
 *
 * @throws If the adapter does not implement `createAdminUser`.
 */
export async function createAdminUser(config: DBConfig, data: any) {
  const adapter = getAdapter(config.type, config);

  if (!adapter?.createAdminUser) {
    throw new Error(`${config.type} adapter does not implement createAdminUser`);
  }

  return adapter.createAdminUser(config, data);
}