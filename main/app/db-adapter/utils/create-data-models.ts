import fs from 'fs';
import path from 'path';
import { DBAdapter, DBConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_MODELS_DIR = path.resolve(process.cwd(), '../shared_models/system_models');
const USER_MODELS_DIR = path.resolve(process.cwd(), '../shared_models/users_models');

export async function CreateDataModels(adapter: DBAdapter & { config?: DBConfig }, projectId: string) {
  const dbConfig = adapter.config;
  if (!dbConfig || !projectId) throw new Error('Missing DB config or projectId');

  if (!adapter.create) throw new Error('Adapter does not implement create()');
  if (!('createTable' in adapter)) throw new Error('Adapter does not implement createTable()');

  const dirs = [SYSTEM_MODELS_DIR, USER_MODELS_DIR];
  const createdModels: any[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const schema = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));

      // 1️⃣ Create actual DB table
      const tableName = schema.table_name;
      if (tableName && schema.columns) {
        console.log(`📦 Creating table: ${tableName}`);
        await (adapter as any).createTable(tableName, { columns: schema.columns });
      }

      // 2️⃣ Store model metadata in nxf_system_models
      const modelData = {
        sm_id: uuidv4(),
        project_id: projectId,
        name: schema.table_name || 'nxf_system_models',
        schema: schema.columns || {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      await adapter.create(dbConfig, 'nxf_system_models', modelData);
      createdModels.push(modelData);
    }
  }

  return createdModels;
}
