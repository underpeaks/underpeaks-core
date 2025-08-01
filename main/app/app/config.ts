import fs from 'fs';
import path from 'path';
  import { fileURLToPath } from 'url';


export function hasValidConfig(): boolean {


// Only if you're in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(__dirname, '../app/config.json');
  if (!fs.existsSync(configPath)) return false;

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    console.log(content);
    return !!config?.dbType; // Or however you validate it
  } catch {
    return false;
  }
}
