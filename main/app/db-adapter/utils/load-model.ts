// load-models.ts
import fs from 'fs';
import path from 'path';
import { normalizeColumns } from './normalizeColumns';

const BASE = path.resolve(process.cwd(), '../shared_models');

export function loadAllModels(selectedProjectType: string) {
  const dirs = [
    path.join(BASE, 'system_models'),
    path.join(BASE, 'users_models'),
    ...(selectedProjectType !== 'blank'
      ? [path.join(BASE, `${selectedProjectType}_models`)]
      : []),
  ];

  const models: any[] = [];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));

      if (!raw.table_name) continue;

      const columns = normalizeColumns(raw.columns);
      if (!columns.length) continue;

      models.push({
        name: raw.table_name,
        columns,
      });
    }
  }

  return models;
}