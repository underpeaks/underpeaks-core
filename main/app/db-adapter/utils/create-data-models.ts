import fs from 'fs';
import path from 'path';
import { DBAdapter, DBConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_MODELS_DIR = path.resolve(process.cwd(), '../shared_models/system_models');
const USER_MODELS_DIR = path.resolve(process.cwd(), '../shared_models/users_models');

export async function CreateDataModels(adapter: DBAdapter & { config?: DBConfig }, projectId: string) {
  const dbConfig = adapter.config;
  if (!dbConfig || !projectId) throw new Error('Missing DB config or projectId');

  if (!adapter.create) throw new Error('Adapter does not implement create()'); // 🔹 check

  const dirs = [SYSTEM_MODELS_DIR, USER_MODELS_DIR];
  const createdModels = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const schema = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));

      const modelData = {
        sm_id: uuidv4(),
        project_id: projectId,
        name: schema.table_name || 'nxf_system_models',
        schema: schema.columns || {},
        created_at: new Date(),
        updated_at: new Date(),
      };

      await adapter.create(dbConfig, 'nxf_system_models', modelData); // ✅ safe now
      createdModels.push(modelData);
    }
  }

  return createdModels;
}
