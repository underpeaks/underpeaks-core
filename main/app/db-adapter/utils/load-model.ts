/**
 * load-models.ts
 *
 * A utility module that reads JSON schema definition files from disk and
 * returns a clean, normalised list of data models for a given project type.
 *
 * This module is used during project setup to discover which tables need to
 * be created, without actually creating them. Think of it as the "reader"
 * step that sits before the "writer" step (CreateUserDataModels).
 *
 * ─── What it does ─────────────────────────────────────────────────────────
 *
 * 1. Builds a list of directories to scan based on the selected project type:
 *    - system_models      → always included (core tables every project needs).
 *    - users_models       → always included (user-related tables).
 *    - <type>_models      → included only when project type is not 'blank'.
 *
 * 2. For each directory, reads every `.json` file it finds.
 *
 * 3. For each file:
 *    - Skips it if there is no `table_name` field (malformed file).
 *    - Normalises the column definitions via `normalizeColumns`.
 *    - Skips it if normalisation produces no columns.
 *    - Pushes a clean `{ name, columns }` object into the result array.
 *
 * 4. Returns the full list of discovered models to the caller.
 *
 * ─── Exports ──────────────────────────────────────────────────────────────
 *
 * loadAllModels(selectedProjectType)
 *   Scans the relevant model directories and returns all valid models.
 */

import fs from 'fs';
import path from 'path';
import { normalizeColumns } from './normalizeColumns';

// ---------------------------------------------------------------------------
// Base directory
// ---------------------------------------------------------------------------

/**
 * BASE
 * The root directory that contains all shared model subdirectories.
 * Resolved to an absolute path so it works regardless of where the
 * process is started from.
 *
 * Expected structure on disk:
 *   shared_models/
 *   ├── system_models/       ← core system tables
 *   ├── users_models/        ← user-related tables
 *   ├── ecommerce_models/    ← example project-type tables
 *   └── crm_models/          ← another project-type example
 */
const BASE = path.resolve(process.cwd(), '../shared_models');

// ---------------------------------------------------------------------------
// loadAllModels
// ---------------------------------------------------------------------------

/**
 * loadAllModels
 *
 * Scans all relevant model directories for the given project type and returns
 * a normalised array of model definitions ready for further processing.
 *
 * ─── Directory selection logic ────────────────────────────────────────────
 *
 * The directories scanned depend on `selectedProjectType`:
 *
 * - 'blank'       → only system_models and users_models are scanned.
 *                   No project-type directory is added because a blank
 *                   project has no domain-specific tables.
 *
 * - anything else → system_models, users_models, AND the type-specific
 *                   directory (e.g. `ecommerce_models`) are all scanned.
 *
 * ─── File processing logic ────────────────────────────────────────────────
 *
 * For each `.json` file found:
 *   1. It is parsed from disk.
 *   2. If it has no `table_name`, it is skipped (malformed/incomplete file).
 *   3. Its columns are passed through `normalizeColumns` to ensure a
 *      consistent ColumnDef[] shape regardless of the source format.
 *   4. If the normalised column list is empty, the file is skipped.
 *   5. Otherwise, a clean model object `{ name, columns }` is added
 *      to the result array.
 *
 * Directories that do not exist on disk are silently skipped. This is
 * intentional — a project type may not have its own model directory yet.
 *
 * @param selectedProjectType - The project template identifier (e.g.
 *                              'ecommerce', 'crm', 'blank'). Determines
 *                              which extra model directory is scanned.
 *
 * @returns An array of model objects, each containing:
 *   - name    {string}      — The table name from the JSON file.
 *   - columns {ColumnDef[]} — The normalised column definitions.
 *
 *   Returns an empty array if no valid schema files are found.
 */
export function loadAllModels(selectedProjectType: string) {
  // -------------------------------------------------------------------------
  // Step 1: Build the list of directories to scan
  // -------------------------------------------------------------------------

  /**
   * Always start with system and user model directories.
   * Append the project-type directory only when the type is not 'blank'.
   */
  const dirs = [
    path.join(BASE, 'system_models'),
    path.join(BASE, 'users_models'),
    ...(selectedProjectType !== 'blank'
      ? [path.join(BASE, `${selectedProjectType}_models`)]
      : []),
  ];

  // -------------------------------------------------------------------------
  // Step 2: Iterate directories and collect models
  // -------------------------------------------------------------------------

  /** Accumulates all valid model definitions found across all directories. */
  const models: any[] = [];

  for (const dir of dirs) {
    /**
     * If the directory doesn't exist, skip it silently.
     * This handles cases where a project type has no dedicated models yet.
     */
    if (!fs.existsSync(dir)) continue;

    /**
     * Read only `.json` files — ignore any other files that may be present
     * in the directory (e.g. README.md, .DS_Store).
     */
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      // -----------------------------------------------------------------------
      // Step 3a: Parse the schema file
      // -----------------------------------------------------------------------

      /**
       * Each file is expected to be a valid JSON object with at minimum:
       *   { "table_name": "...", "columns": { ... } or [ ... ] }
       */
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, file), 'utf-8')
      );

      /**
       * Guard: if `table_name` is missing, the file is malformed.
       * Skip it rather than pushing a model with an undefined name.
       */
      if (!raw.table_name) continue;

      // -----------------------------------------------------------------------
      // Step 3b: Normalise columns
      // -----------------------------------------------------------------------

      /**
       * `normalizeColumns` accepts both array and object column formats and
       * always returns a consistent ColumnDef[]. If the result is empty
       * (no valid columns found), skip this file entirely.
       */
      const columns = normalizeColumns(raw.columns);
      if (!columns.length) continue;

      // -----------------------------------------------------------------------
      // Step 3c: Add the model to the result list
      // -----------------------------------------------------------------------

      /**
       * Push a clean, minimal model object.
       * Only `name` and `columns` are needed by consumers of this function —
       * any extra fields from the raw JSON are intentionally omitted.
       */
      models.push({
        name: raw.table_name,
        columns,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Step 4: Return collected models
  // -------------------------------------------------------------------------

  return models;
}