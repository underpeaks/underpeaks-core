/**
 * normalizeColumns.ts
 *
 * A pure utility function that converts column definitions from any supported
 * input format into a consistent ColumnDef array.
 *
 * ─── Why this exists ──────────────────────────────────────────────────────
 *
 * JSON schema files across the codebase can define columns in two different
 * shapes depending on who authored the file or which tool generated it:
 *
 * Format A — Array (already the target shape):
 *   "columns": [
 *     { "name": "id", "type": "uuid", "is_primary": true },
 *     { "name": "email", "type": "text", "nullable": false }
 *   ]
 *
 * Format B — Object (key = column name, value = definition):
 *   "columns": {
 *     "id":    { "type": "uuid", "is_primary": true },
 *     "email": { "type": "text", "nullable": false }
 *   }
 *
 * Rather than forcing every consumer to handle both shapes, this function
 * acts as a single normalisation point. Pass in anything — array, object,
 * null, or undefined — and always get back a clean ColumnDef[].
 *
 * ─── Exports ──────────────────────────────────────────────────────────────
 *
 * normalizeColumns(columns)
 *   Accepts raw column data in any supported format and returns ColumnDef[].
 */

import { ColumnDef } from '../types';

/**
 * normalizeColumns
 *
 * Converts raw column definitions into a normalised ColumnDef array.
 *
 * ─── Input handling ───────────────────────────────────────────────────────
 *
 * | Input type      | Behaviour                                            |
 * |-----------------|------------------------------------------------------|
 * | null/undefined  | Returns an empty array — nothing to normalise.       |
 * | Array           | Returned as-is — already in the target format.       |
 * | Plain object    | Each key becomes a ColumnDef with the key as `name`. |
 * | Anything else   | Returns an empty array — unrecognised format.        |
 *
 * ─── Field defaults (object format only) ─────────────────────────────────
 *
 * When converting from object format, the following defaults are applied
 * for fields that may be missing from the raw definition:
 *
 * - is_primary  → checks `is_primary` first, then `primary_key`, defaults to false.
 *                 The dual-check exists because different schema authors use
 *                 different naming conventions for the same concept.
 * - unique      → defaults to false (most columns are not unique).
 * - nullable    → defaults to true (most columns allow null values).
 * - default     → left as-is (undefined if not specified).
 * - foreign_key → left as-is (undefined if not specified).
 *
 * @param columns - Raw column data. Accepts an array of ColumnDef objects,
 *                  a plain object whose keys are column names, null,
 *                  or undefined.
 *
 * @returns A ColumnDef[] array. Returns an empty array for unrecognised
 *          or empty input — never throws.
 */
export function normalizeColumns(columns: any): ColumnDef[] {
  // -------------------------------------------------------------------------
  // Guard: null or undefined input
  // -------------------------------------------------------------------------

  /**
   * If no columns were provided at all (e.g. a schema file with a missing
   * or null `columns` field), return an empty array immediately.
   * The caller is responsible for deciding what to do with an empty result.
   */
  if (!columns) return [];

  // -------------------------------------------------------------------------
  // Case 1: Already an array
  // -------------------------------------------------------------------------

  /**
   * If the input is already an array, we assume it matches the ColumnDef
   * shape and return it directly without further processing.
   * This covers Format A schema files.
   */
  if (Array.isArray(columns)) return columns;

  // -------------------------------------------------------------------------
  // Case 2: Plain object — convert to array
  // -------------------------------------------------------------------------

  /**
   * If the input is a plain object, each entry represents one column where:
   *   - The key   → becomes the `name` field of the ColumnDef.
   *   - The value → is spread into the remaining ColumnDef fields.
   *
   * Sensible defaults are applied for optional boolean flags so that
   * consumers always receive a fully-shaped ColumnDef regardless of how
   * minimal the source definition was.
   */
  if (typeof columns === 'object') {
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

  // -------------------------------------------------------------------------
  // Fallback: unrecognised input type
  // -------------------------------------------------------------------------

  /**
   * If the input is neither null/undefined, an array, nor a plain object
   * (e.g. a string or number was passed by mistake), return an empty array.
   * This keeps the function safe to call without wrapping in try/catch.
   */
  return [];
}