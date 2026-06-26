/**
 * CreateUserDataModels
 *
 * This function is responsible for bootstrapping the database schema for a
 * newly created project. It reads JSON model definition files from one or more
 * directories on disk, creates the corresponding database tables, and then
 * records each model's metadata in the `nxf_system_models` tracking table.
 *
 * Think of it as the "schema installer" — when a new project is set up, this
 * function ensures all the tables that project needs actually exist in the DB.
 *
 * ─── What it does, step by step ───────────────────────────────────────────
 *
 * 1. Validates that the adapter has a DB config and that a project ID was given.
 * 2. Validates that the adapter supports the two methods this function needs:
 *    `create` (insert a row) and `createTable` (create a DB table).
 * 3. Uses a run-cache (RUN_CACHE) to prevent the same project+type combination
 *    from being processed more than once in the same server process lifecycle.
 * 4. Builds a list of directories to scan for JSON model files:
 *    - system_models  → always included (core tables every project needs).
 *    - users_models   → always included (user-related tables).
 *    - <type>_models  → included only when selectedProjectType is not 'blank'.
 * 5. For each JSON file found:
 *    a. Reads and parses the file to get the schema definition.
 *    b. Skips files with no `table_name` field.
 *    c. Skips tables not in `selectedModels` (when that filter list is provided).
 *    d. Normalizes the column definitions via `normalizeColumns`.
 *    e. Calls `adapter.createTable` to physically create the table in the DB.
 *    f. Calls `adapter.create` to record the model's metadata in
 *       `nxf_system_models` so the app knows which tables belong to which project.
 * 6. Returns a summary object containing all the model records that were created.
 *
 * ─── Parameters ────────────────────────────────────────────────────────────
 *
 * @param adapter              - The database adapter instance. Must implement
 *                               `create`, `createTable`, and expose a `config`
 *                               property with the DB connection details.
 * @param projectId            - The UUID of the project being set up. Used to
 *                               link each created model back to the project.
 * @param selectedProjectType  - The project template type (e.g. 'ecommerce',
 *                               'crm', 'blank'). Determines which extra model
 *                               directory is scanned.
 * @param selectedModels       - Optional allow-list of table names. When
 *                               provided, only tables whose `table_name` field
 *                               appears in this array will be created. Pass an
 *                               empty array (default) to create all tables found.
 *
 * ─── Returns ───────────────────────────────────────────────────────────────
 *
 * @returns An object with:
 *   - skipped {boolean}  — true if this project+type combo was already run.
 *   - message {string}   — Human-readable summary (only present when not skipped).
 *   - data    {any[]}    — Array of model metadata objects that were created.
 *
 * ─── Throws ────────────────────────────────────────────────────────────────
 *
 * @throws If `dbConfig` or `projectId` are missing.
 * @throws If the adapter does not implement `create` or `createTable`.
 */

import fs from 'fs';
import path from 'path';
import { DBAdapter, DBConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { normalizeColumns } from './normalizeColumns';

// ---------------------------------------------------------------------------
// Directory constants
// ---------------------------------------------------------------------------

/**
 * SYSTEM_MODELS_DIR
 * Absolute path to the folder containing core system-level JSON model files.
 * These tables are created for every project regardless of project type.
 * Example: nxf_users, nxf_sessions, nxf_audit_logs, etc.
 */
const SYSTEM_MODELS_DIR = path.resolve(
  process.cwd(),
  '../shared_models/system_models'
);

/**
 * USER_MODELS_DIR
 * Absolute path to the folder containing user-related JSON model files.
 * Always included alongside system models.
 */
const USER_MODELS_DIR = path.resolve(
  process.cwd(),
  '../shared_models/users_models'
);

// ---------------------------------------------------------------------------
// Run-once cache
// ---------------------------------------------------------------------------

/**
 * RUN_CACHE
 *
 * A Set that tracks which "projectId + projectType" combinations have already
 * been processed during the current server process lifetime.
 *
 * Why this exists:
 * In some deployment or testing scenarios, `CreateUserDataModels` can be called
 * multiple times for the same project (e.g. hot-reloads, retries, parallel
 * requests). Running it twice would attempt to create tables that already
 * exist, potentially causing DB errors or duplicate metadata rows.
 *
 * The cache key is formatted as `"<projectId>-<selectedProjectType>"`.
 * If the key is already in the Set, the function exits early with
 * `{ skipped: true, data: [] }`.
 *
 * Important: This cache lives in memory and resets when the server restarts.
 * It is not persisted to the database or disk.
 */
const RUN_CACHE = new Set<string>();

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function CreateUserDataModels(
  adapter: DBAdapter & { config?: DBConfig },
  projectId: string,
  tenant_id: string,
  selectedProjectType: string,
  
  selectedModels: string[] = []
) {
  // -------------------------------------------------------------------------
  // Step 1: Extract and validate DB config
  // -------------------------------------------------------------------------

  /**
   * `adapter.config` holds the database connection settings.
   * Both `dbConfig` and `projectId` are required — without them we cannot
   * write metadata rows or associate tables with the correct project.
   */
  const dbConfig = adapter.config;

  if (!dbConfig || !projectId) {
    throw new Error('Missing DB config or projectId');
  }

  // -------------------------------------------------------------------------
  // Step 2: Validate required adapter methods
  // -------------------------------------------------------------------------

  /**
   * This function needs two specific adapter capabilities:
   * - `createTable` → physically creates a table in the target database.
   * - `create`      → inserts a metadata row into `nxf_system_models`.
   *
   * If either is missing the adapter is incompatible and we throw early
   * rather than failing silently halfway through the model list.
   */
  if (!adapter.create || !adapter.createTable) {
    throw new Error('Adapter missing required methods');
  }

  // -------------------------------------------------------------------------
  // Step 3: Duplicate-run guard
  // -------------------------------------------------------------------------

  /**
   * Build a unique cache key for this run and check if we've already
   * processed this combination. If so, skip and return immediately.
   */
  const runKey = `${projectId}-${selectedProjectType}`;

  if (RUN_CACHE.has(runKey)) {
    console.log('logs.skippingDuplicate');
    return { skipped: true, data: [] };
  }

  RUN_CACHE.add(runKey);

  // -------------------------------------------------------------------------
  // Step 4: Build the list of model directories to scan
  // -------------------------------------------------------------------------

  /**
   * PROJECT_MODELS_DIR is the type-specific model directory.
   * For example, if `selectedProjectType` is 'ecommerce', this resolves to:
   *   ../shared_models/ecommerce_models
   *
   * This directory is only added when the project type is not 'blank',
   * because a blank project has no extra domain-specific tables.
   */
  const PROJECT_MODELS_DIR = path.resolve(
    process.cwd(),
    `../shared_models/${selectedProjectType}_models`
  );

  /**
   * `dirs` is the ordered list of directories we will scan for JSON schemas.
   * System and user models always come first; project-type models are appended
   * when relevant.
   */
  const dirs = [
    SYSTEM_MODELS_DIR,
    USER_MODELS_DIR,
    ...(selectedProjectType !== 'blank' ? [PROJECT_MODELS_DIR] : []),
  ];

  // -------------------------------------------------------------------------
  // Step 5: Iterate directories and create tables
  // -------------------------------------------------------------------------

  /**
   * `createdModels` accumulates the metadata record for each table we create.
   * This array is returned to the caller at the end.
   */
  const createdModels: any[] = [];

  for (const dir of dirs) {
    /**
     * Skip this directory entirely if it doesn't exist on disk.
     * This is normal — e.g. a project type that has no dedicated models yet.
     */
    if (!fs.existsSync(dir)) continue;

    /**
     * Read all JSON files in the directory.
     * Non-JSON files (README.md, etc.) are automatically excluded.
     */
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      // -----------------------------------------------------------------------
      // 5a. Parse the schema file
      // -----------------------------------------------------------------------

      /**
       * Each JSON file describes one table. The expected shape is:
       * {
       *   "table_name": "nxf_products",
       *   "columns": [ { "name": "id", "type": "uuid", ... }, ... ]
       * }
       */
      const schema = JSON.parse(
        fs.readFileSync(path.join(dir, file), 'utf-8')
      );

      const tableName = schema.table_name;

      /**
       * If the file has no `table_name` field it is malformed — skip it
       * rather than attempting to create a table with an undefined name.
       */
      if (!tableName) continue;

      // -----------------------------------------------------------------------
      // 5b. Apply the selectedModels allow-list filter
      // -----------------------------------------------------------------------

      /**
       * When the caller provides a non-empty `selectedModels` array,
       * only tables whose name appears in that list are processed.
       * This is useful for partial setups or migrations that only need
       * a specific subset of tables.
       */
      if (selectedModels.length > 0 && !selectedModels.includes(tableName)) {
        continue;
      }

      // -----------------------------------------------------------------------
      // 5c. Normalize columns
      // -----------------------------------------------------------------------

      /**
       * `normalizeColumns` converts the raw column definitions from the JSON
       * file into the consistent shape the adapter expects.
       * If normalization returns nothing (empty or invalid columns), skip the file.
       */
      const columns = normalizeColumns(schema.columns);
      if (!columns?.length) continue;

      // -----------------------------------------------------------------------
      // 5d. Create the physical table in the database
      // -----------------------------------------------------------------------

      console.log('logs.creatingTable', tableName);

      /**
       * `adapter.createTable` issues the DDL statement (e.g. CREATE TABLE)
       * against the target database using the normalized column definitions.
       */
      await adapter.createTable(tableName, { columns });

      // -----------------------------------------------------------------------
      // 5e. Record the model metadata in nxf_system_models
      // -----------------------------------------------------------------------

      /**
       * After the table is created in the DB, we insert a metadata row into
       * the `nxf_system_models` table. This lets the application layer know:
       * - Which tables exist for a given project.
       * - What their schema looks like (stored as JSON for introspection).
       * - When they were created/last updated.
       */
      const modelData = {
  sm_id:      uuidv4(),
  tenant_id:  tenant_id,
  project_id: projectId,
  name:       tableName,
  schema:     columns,
  is_system:  false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
      await adapter.create(dbConfig, 'nxf_system_models', modelData);

      createdModels.push(modelData);
    }
  }

  // -------------------------------------------------------------------------
  // Step 6: Return summary
  // -------------------------------------------------------------------------

  /**
   * Return the full list of created model records along with a status flag.
   * The caller can use `data` to inspect which tables were set up, or
   * log the `message` for audit purposes.
   */
  return {
    skipped: false,
    message: 'Models created successfully',
    data:    createdModels,
  };
}