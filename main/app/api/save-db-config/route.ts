import { writeFile } from 'fs/promises';
import path from 'path';

const ENV_FILE_PATH = path.resolve(process.cwd(), '.env.local');
console.log('📝 Writing .env.local to:', ENV_FILE_PATH);

/** Extract Mongo DB name from connection string */
function extractMongoDbName(uri: string): string | null {
  try {
    const afterSlash = uri.split('.net/')[1];
    if (!afterSlash) return null;
    return afterSlash.split('?')[0];
  } catch {
    return null;
  }
}

/** Serialize Firebase Service Account JSON */
function serializeServiceAccount(value: any): string {
  let obj: any;

  if (typeof value === 'string') {
    obj = JSON.parse(value);
  } else {
    obj = value;
  }

  if (obj.private_key) {
    obj.private_key = obj.private_key.replace(/\r?\n/g, '\\n');
  }

  return JSON.stringify(obj);
}

/** Serialize Firebase Web Config */
function serializeFirebaseWebConfig(value: string | object): string {
  let obj: any;

  if (typeof value === 'string') {
    value = value.trim().replace(/;$/, '');
    obj = eval('(' + value + ')');
  } else {
    obj = value;
  }

  return JSON.stringify(obj);
}

async function writeEnvFileFromObject(env: Record<string, any>) {
  const lines: string[] = [];

  if (!env.type) throw new Error('Missing "type" in env payload');

  lines.push(`NEXT_DB_TYPE=${env.type}`);
  lines.push(`NEXT_PUBLIC_DB_TYPE=${env.type}`);

  // -----------------------------
  // MongoDB
  // -----------------------------
  if (env.type === 'mongodb' && env.connectionString) {
    lines.push(`NEXT_DB_MONGO_URI=${env.connectionString}`);

    const dbName = extractMongoDbName(env.connectionString);
    if (dbName) {
      lines.push(`NEXT_DB_MONGO_DB_NAME=${dbName}`);
    }
  }

  // -----------------------------
  // MySQL
  // -----------------------------
  if (env.type === 'mysql') {
    if (!env.host || !env.database || !env.user || !env.password) {
      throw new Error('MySQL config missing host, database, user, or password');
    }

    lines.push(`NEXT_DB_MYSQL_HOST=${env.host}`);
    lines.push(`NEXT_DB_MYSQL_PORT=${env.port || 3306}`);
    lines.push(`NEXT_DB_MYSQL_DATABASE=${env.database}`);
    lines.push(`NEXT_DB_MYSQL_USER=${env.user}`);
    lines.push(`NEXT_DB_MYSQL_PASSWORD=${env.password}`);
  }

  // -----------------------------
  // PostgreSQL
  // -----------------------------
  if (env.type === 'postgres') {
    if (!env.host || !env.database || !env.user || !env.password) {
      throw new Error('Postgres config missing host, database, user, or password');
    }

    lines.push(`NEXT_DB_POSTGRES_HOST=${env.host}`);
    lines.push(`NEXT_DB_POSTGRES_PORT=${env.port || 5432}`);
    lines.push(`NEXT_DB_POSTGRES_DATABASE=${env.database}`);
    lines.push(`NEXT_DB_POSTGRES_USER=${env.user}`);
    lines.push(`NEXT_DB_POSTGRES_PASSWORD=${env.password}`);
  }

  // -----------------------------
  // Supabase
  // -----------------------------
  if (env.url) lines.push(`NEXT_PUBLIC_SUPABASE_URL=${env.url}`);
  if (env.anonKey) lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.anonKey}`);

  // -----------------------------
  // Firebase
  // -----------------------------
  if (env.firebaseConfigJson) {
    lines.push(
      `NEXT_DB_FIREBASE_SERVICE_ACCOUNT=${serializeServiceAccount(
        env.firebaseConfigJson
      )}`
    );
  }

  if (env.firebaseWebConfig) {
    lines.push(
      `NEXT_PUBLIC_FIREBASE_CONFIG=${serializeFirebaseWebConfig(env.firebaseWebConfig)}`
    );
  }

  if (env.firebaseDbType) {
    lines.push(`NEXT_DB_FIREBASE_DB_TYPE=${env.firebaseDbType}`);
  }

  if (env.storageUrl) {
    lines.push(`NEXT_DB_STORAGE_URL=${env.storageUrl}`);
  }

  await writeFile(ENV_FILE_PATH, lines.join('\n') + '\n', 'utf-8');
  console.log('✅ .env.local written successfully');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
