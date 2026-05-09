import { getAdapter } from '@/app/db-adapter'
import { DBConfig, DBType } from '@/app/db-adapter/types'
import { parseFirebaseServiceAccount, parseFirebaseWebConfig } from '@/app/lib/firebaseConfig'

export function getStorageAdapter() {
  const dbType = process.env.NEXT_PUBLIC_DB_TYPE as DBType

  let dbConfig: DBConfig

  if (dbType === 'firebase') {
    const serviceAccount = process.env.NEXT_DB_FIREBASE_SERVICE_ACCOUNT
    const configAccount  = process.env.NEXT_PUBLIC_FIREBASE_CONFIG
    if (!serviceAccount) throw new Error('Firebase service account missing')
    const parsedAccount = parseFirebaseServiceAccount(serviceAccount)
    const parsedConfig  = parseFirebaseWebConfig(configAccount)
    dbConfig = {
      type:               'firebase',
      firebaseConfigJson: JSON.stringify(parsedAccount),
      storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_URL,
    }
  } else if (dbType === 'supabase') {
    dbConfig = {
      type:        'supabase',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey:     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
    }
  } else if (dbType === 'mongodb') {
    dbConfig = {
      type:             'mongodb',
      connectionString: process.env.NEXT_DB_MONGO_URI!,
      database:         process.env.NEXT_DB_MONGO_DB_NAME!,
    }
  } else if (dbType === 'mysql') {
    dbConfig = {
      type:     'mysql',
      host:     process.env.NEXT_DB_MYSQL_HOST!,
      user:     process.env.NEXT_DB_MYSQL_USER!,
      password: process.env.NEXT_DB_MYSQL_PASSWORD!,
      database: process.env.NEXT_DB_MYSQL_DATABASE!,
      port:     Number(process.env.NEXT_DB_MYSQL_PORT ?? 3306),
    }
  } else if (dbType === 'postgres') {
    dbConfig = {
      type:     'postgres',
      host:     process.env.NEXT_DB_POSTGRES_HOST!,
      user:     process.env.NEXT_DB_POSTGRES_USER!,
      password: process.env.NEXT_DB_POSTGRES_PASSWORD!,
      database: process.env.NEXT_DB_POSTGRES_DATABASE!,
      port:     Number(process.env.NEXT_DB_POSTGRES_PORT ?? 5432),
    }
  } else {
    throw new Error(`Unsupported DB type: ${dbType}`)
  }

  return getAdapter(dbType, dbConfig)
}