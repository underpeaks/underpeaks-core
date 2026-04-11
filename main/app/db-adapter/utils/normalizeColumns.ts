import { ColumnDef } from '../types';

export function normalizeColumns(columns: any): ColumnDef[] {
  if (!columns) return [];

  if (Array.isArray(columns)) return columns;

  if (typeof columns === 'object') {
    return Object.entries(columns).map(([name, def]: [string, any]) => ({
      name,
      type: def.type,
      is_primary: def.is_primary ?? def.primary_key ?? false,
      unique: def.unique ?? false,
      nullable: def.nullable ?? true,
      default: def.default,
      foreign_key: def.foreign_key,
    }));
  }

  return [];
}