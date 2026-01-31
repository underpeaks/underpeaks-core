import { DBConfig, DBType } from '@/app/db-adapter/types'

function getDbType(value?: string): DBType {
  switch (value) {
    case 'firebase':
    case 'postgres':
    case 'mongodb':
    case 'supabase':
    case 'mysql':
      return value
    default:
      throw new Error(`Invalid or missing NEXT_DB_TYPE: ${value}`)
  }
}

function parseJsonEnv<T = any>(value?: string, name?: string): T {
  if (!value) throw new Error(`Missing ${name} in environment`)
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${name} is not valid JSON`)
  }
}

/**
 * Named export — this is **critical**
 */
export function loadDbFromEnv(): DBConfig {
  const type = getDbType(process.env.NEXT_DB_TYPE)

  switch (type) {
    case 'firebase': {
      const firebaseServiceAccountJson =
        process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
      const firebaseWebConfigJson =
        process.env.NEXT_PUBLIC_FIREBASE_CONFIG

      if (!firebaseServiceAccountJson)
        throw new Error('Missing NEXT_DB_FIREBASE_SERVICE_ACCOUNT')
      if (!firebaseWebConfigJson)
        throw new Error('Missing NEXT_PUBLIC_FIREBASE_CONFIG')

      return {
        type,
        firebaseConfigJson: firebaseServiceAccountJson,
        firebaseWebConfig: firebaseWebConfigJson,
        storageBucket: 'gs://'+ process.env.NEXT_DB_FIREBASE_STORAGE_BUCKET,
      }
    }

    case 'postgres':
      return { type, url: process.env.NEXT_DB_POSTGRES_URL! }

    case 'mongodb':
      return { type, uri: process.env.NEXT_DB_MONGODB_URI! }

    case 'supabase':
      return {
        type,
        supabaseUrl: process.env.NEXT_DB_SUPABASE_URL!,
        supabaseServiceKey: process.env.NEXT_DB_SUPABASE_SERVICE_KEY!,
      }

    case 'mysql':
      return {
        type,
        host: process.env.NEXT_DB_MYSQL_HOST!,
        user: process.env.NEXT_DB_MYSQL_USER!,
        password: process.env.NEXT_DB_MYSQL_PASSWORD!,
        database: process.env.NEXT_DB_MYSQL_DATABASE!,
      }

    default:
      throw new Error(`Unhandled DB type: ${type}`)
  }
}
