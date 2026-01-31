// app/api/write-env/route.ts
import { writeFile } from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = path.resolve(process.cwd(), '.env.local');
console.log('📝 Writing .env.local to:', ENV_FILE_PATH);

/**
 * Serialize Firebase Service Account JSON for .env
 * - Escapes private_key newlines
 */
function serializeServiceAccount(value: any): string {
  let obj: any;

  if (typeof value === 'string') {
    try {
      obj = JSON.parse(value);
    } catch {
      throw new Error('Invalid Firebase Service Account JSON');
    }
  } else if (typeof value === 'object' && value !== null) {
    obj = value;
  } else {
    throw new Error('Firebase Service Account must be an object or JSON string');
  }

  if ('private_key' in obj && typeof obj.private_key === 'string') {
    obj.private_key = obj.private_key.replace(/\r?\n/g, '\\n');
  }

  return JSON.stringify(obj);
}


/**
 * Serialize Firebase Web Config for .env
 * - Ensures valid JSON on a single line
 * - Accepts JS object or JS-style pasted string
 */
function serializeFirebaseWebConfig(value: string | object): string {
  let obj: any;

  if (typeof value === 'string') {
    // Remove trailing semicolon if pasted from JS
    value = value.trim().replace(/;$/, '');
    try {
      // Evaluate JS object string safely
      obj = eval('(' + value + ')'); // converts JS object to real object
    } catch {
      throw new Error('Invalid Firebase Web Config. Make sure it is a valid JS object.');
    }
  } else if (typeof value === 'object' && value !== null) {
    obj = value;
  } else {
    throw new Error('Firebase Web Config must be an object or valid JS string.');
  }

  // Return JSON string (keys wrapped in double quotes, single line)
  return JSON.stringify(obj);
}

/**
 * Convert env object into .env.local content
 */
async function writeEnvFileFromObject(env: Record<string, any>) {
  const lines: string[] = [];

  // REQUIRED DB type
  if (!env.type) throw new Error('Missing "type" in env payload');
  lines.push(`NEXT_DB_TYPE=${env.type}`);

  // RELATIONAL DBs
  if (env.host) lines.push(`NEXT_DB_HOST=${env.host}`);
  if (env.port) lines.push(`NEXT_DB_PORT=${env.port}`);
  if (env.database) lines.push(`NEXT_DB_NAME=${env.database}`);
  if (env.user) lines.push(`NEXT_DB_USER=${env.user}`);
  if (env.password) lines.push(`NEXT_DB_PASSWORD=${env.password}`);

  // SUPABASE
  if (env.url) lines.push(`NEXT_DB_URL=${env.url}`);
  if (env.anonKey) lines.push(`NEXT_DB_ANON_KEY=${env.anonKey}`);

  // FIREBASE
  if (env.firebaseConfigJson) {
    lines.push(`NEXT_DB_FIREBASE_SERVICE_ACCOUNT=${serializeServiceAccount(env.firebaseConfigJson)}`);
  }

  if (env.firebaseWebConfig) {
    lines.push(`NEXT_PUBLIC_FIREBASE_CONFIG=${serializeFirebaseWebConfig(env.firebaseWebConfig)}`);
  }

  if (env.firebaseDbType) {
    lines.push(`NEXT_DB_FIREBASE_DB_TYPE=${env.firebaseDbType}`);
  }

  if (env.storageUrl) {
    lines.push(`NEXT_DB_STORAGE_URL=${env.storageUrl}`);
  }

  try {
    // Ensure final newline
    await writeFile(ENV_FILE_PATH, lines.join('\n') + '\n', 'utf-8');
    console.log(`✅ .env.local written successfully (${lines.length} vars)`);
  } catch (err) {
    console.error('❌ Failed writing .env.local', err);
    throw err;
  }
}

/**
 * API route for writing env variables
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('[DEBUG] Received env payload:', body);

    await writeEnvFileFromObject(body);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('❌ ENV write failed', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
