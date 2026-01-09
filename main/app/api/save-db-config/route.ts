import { writeFile } from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = path.resolve(process.cwd(), '.env.local');

/**
 * Serialize any value for .env file.
 * - For Firebase JSON, escape private_key newlines
 * - Convert object to single-line JSON (removes ALL newlines)
 */
function serializeJsonValue(value: any): string {
  if (typeof value === 'object' && value !== null) {
    const clone = JSON.parse(JSON.stringify(value));

    if ('private_key' in clone && typeof clone.private_key === 'string') {
      clone.private_key = clone.private_key.replace(/\n/g, '\\n');
    }

    // Convert to fully single-line JSON
    return JSON.stringify(clone).replace(/\s*(\r\n|\n|\r)\s*/g, '');
  }

  return String(value);
}

/**
 * Write environment variables from object to .env.local
 * - Keeps all keys exactly as provided
 * - Avoids duplicate keys

 */
export async function writeEnvFileFromObject(envObject: Record<string, any>) {
  const lines: string[] = [];
  const seenKeys = new Set<string>();

  for (const [key, value] of Object.entries(envObject)) {
    if (value === undefined || value === null) continue;

    let serialized = value;
    if (typeof value === 'object') serialized = serializeJsonValue(value);

    if (!seenKeys.has(key)) {
      lines.push(`${key}=${serialized}`);
      seenKeys.add(key);
    }
  }

  
  if (!seenKeys.has('DB_STORAGEURL')) {
    lines.push(`DB_STORAGEURL=${envObject.storageUrl}`);
    seenKeys.add('DB_STORAGEURL');
  }

  await writeFile(ENV_FILE_PATH, lines.join('\n'), 'utf-8');
  console.log(`✅ Written .env.local with ${lines.length} variables`);
}

/**
 * Next.js POST handler for dynamically updating .env.local
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await writeEnvFileFromObject(body);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error('Error writing .env.local:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
