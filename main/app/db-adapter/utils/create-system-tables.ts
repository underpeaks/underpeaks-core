import fs from 'fs';
import path from 'path';
import { DBConfig, ColumnDef } from '../types';
import { getAdapter } from '../index';

const SYSTEM_SCHEMA_DIR = path.resolve(process.cwd(), '../shared_models/system_models');
const USER_SCHEMA_DIR   = path.resolve(process.cwd(), '../shared_models/users_models');

// --- helpers ---
function normalizeColumns(columns: any): ColumnDef[] {
  if (Array.isArray(columns)) return columns;
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

async function createTables(
  config: DBConfig,
  dir: string,
  preferredOrder: string[] = []
) {
  if (!config?.type) throw new Error('Missing DB config/type');

  const adapter = getAdapter(config.type, config);
  if (!adapter?.createTable) {
    console.warn(`[${config.type}] createTable not implemented, skipping table creation`);
    return;
  }

  const schemaJSON = loadSchemasFromDir(dir);

  // Order tables so FK parents go first
  const ordered = [
    ...preferredOrder.filter(t => schemaJSON[t]),
    ...Object.keys(schemaJSON).filter(t => !preferredOrder.includes(t)),
  ];

  for (const tableName of ordered) {
    const tableDef = schemaJSON[tableName];
    if (!tableDef) continue;

    console.log(`[${config.type}] Creating table: ${tableName}`);
    await adapter.createTable!(tableName, tableDef);
  }
}

// --- public API ---
export async function createSystemTables(config: DBConfig) {
  const foundationOrder = [
    'nxf_system_tenants',
    'nxf_users',
    'nxf_system_projects',
    'nxf_system_environments',
  ];
  await createTables(config, SYSTEM_SCHEMA_DIR, foundationOrder);
}

export async function createUsersTables(config: DBConfig) {
  await createTables(config, USER_SCHEMA_DIR);
}

/** ✅ New helper: create admin user in the right adapter */
export async function createAdminUser(config: DBConfig, data: any) {
  const adapter = getAdapter(config.type, config);
  if (!adapter?.createAdminUser) {
    throw new Error(`${config.type} adapter does not implement createAdminUser`);
  }
  return adapter.createAdminUser(config, data);
}
