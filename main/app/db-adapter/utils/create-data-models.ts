/**
 * CreateUserDataModels
 *
 * Bootstraps the database schema for a newly created project. It reads JSON
 * model definition files from one or more directories on disk, creates the
 * corresponding database tables, and records each model's metadata in the
 * `nxf_system_models` tracking table.
 *
 * Directories scanned (in order):
 *   1. shared_models/system_models     - always (core tables every project needs)
 *   2. shared_models/users_models      - always (user-related tables)
 *   3. shared_models/<type>_models     - always, for the selected project type.
 *                                        For 'blank' this is blank_models, which
 *                                        holds the minimum models every project
 *                                        needs (e.g. Pages and Menu).
 *                                        A missing folder is skipped silently.
 *
 * A table that appears in more than one folder is only created and recorded
 * once per run.
 *
 * @param adapter             - DB adapter. Must implement `create`, `createTable`
 *                              and expose a `config` property.
 * @param projectId           - UUID of the project being set up.
 * @param tenant_id           - Tenant that owns the project.
 * @param selectedProjectType - Project template type (e.g. 'ecommerce', 'blank').
 * @param selectedModels      - Optional allow-list of table names. Empty = all.
 *
 * @returns { skipped, message?, data } - data is the list of model records created.
 * @throws If `dbConfig` or `projectId` are missing, or the adapter lacks
 *         `create` / `createTable`.
 */

import fs from 'fs';
import path from 'path';
import { DBAdapter, DBConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { normalizeColumns } from './normalizeColumns';

// ---------------------------------------------------------------------------
// Directory constants
// ---------------------------------------------------------------------------

/** Core system-level model files, created for every project. */
const SYSTEM_MODELS_DIR = path.resolve(
  process.cwd(),
  '../shared_models/system_models'
);

/** User-related model files, always included alongside system models. */
const USER_MODELS_DIR = path.resolve(
  process.cwd(),
  '../shared_models/users_models'
);

// ---------------------------------------------------------------------------
// Run-once cache
// ---------------------------------------------------------------------------

/**
 * Tracks "projectId-projectType" combinations already processed during the
 * current server process, so retries / hot reloads / parallel requests do not
 * create duplicate metadata rows. In-memory only; resets on server restart.
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
  // Step 1: validate config and project id
  const dbConfig = adapter.config;

  if (!dbConfig || !projectId) {
    throw new Error('Missing DB config or projectId');
  }

  // Step 2: validate required adapter methods
  if (!adapter.create || !adapter.createTable) {
    throw new Error('Adapter missing required methods');
  }

  // Step 3: duplicate-run guard
  const runKey = `${projectId}-${selectedProjectType}`;

  if (RUN_CACHE.has(runKey)) {
    console.log('logs.skippingDuplicate');
    return { skipped: true, data: [] };
  }

  RUN_CACHE.add(runKey);

  // Step 4: build the list of directories to scan
  const PROJECT_MODELS_DIR = path.resolve(
    process.cwd(),
    `../shared_models/${selectedProjectType}_models`
  );

  const dirs = [
    SYSTEM_MODELS_DIR,
    USER_MODELS_DIR,
    PROJECT_MODELS_DIR,
  ];

  // Step 5: iterate directories and create tables
  const createdModels: any[] = [];
  const seenTables = new Set<string>();

  for (const dir of dirs) {
    // A missing folder is normal (e.g. a type with no dedicated models yet).
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      // 5a. Parse the schema file
      const schema = JSON.parse(
        fs.readFileSync(path.join(dir, file), 'utf-8')
      );

      const tableName = schema.table_name;

      // Malformed file with no table name: skip.
      if (!tableName) continue;

      // Already created in this run (same table in more than one folder): skip.
      if (seenTables.has(tableName)) continue;
      seenTables.add(tableName);

      // 5b. Apply the selectedModels allow-list filter
      if (selectedModels.length > 0 && !selectedModels.includes(tableName)) {
        continue;
      }

      // 5c. Normalize columns
      const columns = normalizeColumns(schema.columns);
      if (!columns?.length) continue;

      // 5d. Create the physical table
      console.log('logs.creatingTable', tableName);
      await adapter.createTable(tableName, { columns });

      // 5e. Record the model metadata in nxf_system_models
      const modelData = {
        sm_id:      uuidv4(),
        tenant_id:  tenant_id,
        project_id: projectId,
        name:       tableName,
        schema:     columns,
        is_system:  false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await adapter.create(dbConfig, 'nxf_system_models', modelData);

      createdModels.push(modelData);
    }
  }

  // Step 6: return summary
  return {
    skipped: false,
    message: 'Models created successfully',
    data:    createdModels,
  };
}