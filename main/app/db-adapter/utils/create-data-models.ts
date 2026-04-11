import fs from 'fs';
import path from 'path';
import { DBAdapter, DBConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { normalizeColumns } from './normalizeColumns';

const SYSTEM_MODELS_DIR = path.resolve(process.cwd(), '../shared_models/system_models');
const USER_MODELS_DIR = path.resolve(process.cwd(), '../shared_models/users_models');

const RUN_CACHE = new Set<string>();

export async function CreateUserDataModels(
  adapter: DBAdapter & { config?: DBConfig },
  projectId: string,
  selectedProjectType: string,
  selectedModels: string[] = []
) {
  const dbConfig = adapter.config;

  if (!dbConfig || !projectId) throw new Error('Missing DB config or projectId');
  if (!adapter.create || !adapter.createTable) {
    throw new Error('Adapter missing required methods');
  }

  const runKey = `${projectId}-${selectedProjectType}`;
  if (RUN_CACHE.has(runKey)) {
    console.log('⏭️ Skipping duplicate CreateDataModels run');
    return { skipped: true, data: [] };
  }
  RUN_CACHE.add(runKey);

  const PROJECT_MODELS_DIR = path.resolve(
    process.cwd(),
    `../shared_models/${selectedProjectType}_models`
  );

  const dirs = [
    SYSTEM_MODELS_DIR,
    USER_MODELS_DIR,
    ...(selectedProjectType !== 'blank' ? [PROJECT_MODELS_DIR] : []),
  ];

  const createdModels: any[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const schema = JSON.parse(
        fs.readFileSync(path.join(dir, file), 'utf-8')
      );

      const tableName = schema.table_name;
      if (!tableName) continue;

      if (selectedModels.length > 0 && !selectedModels.includes(tableName)) {
        continue;
      }

      const columns = normalizeColumns(schema.columns);
      if (!columns?.length) continue;

      console.log(`📦 Creating table: ${tableName}`);

      await adapter.createTable(tableName, { columns });

      const modelData = {
        sm_id: uuidv4(),
        project_id: projectId,
        name: tableName,
        schema: columns, // ✅ CORRECT
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

     // await adapter.create(dbConfig, 'nxf_system_models', modelData);

      createdModels.push(modelData);
    }
  }

  return {
    skipped: false,
    message: 'Models created successfully',
    data: createdModels,
  };
}