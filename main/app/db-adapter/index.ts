import { DBConfig, DBAdapter } from './types';
import { PostgresAdapter } from './adapters/postgres-adapter';
import { MongoDBAdapter } from './adapters/mongodb-adapter';
import { FirebaseAdapter } from './adapters/firebase-adapter';
import { SupabaseAdapter } from './adapters/supabase-adapter';
import { MySQLAdapter } from './adapters/mysql-adapter';

export function getAdapter(type: string, config: DBConfig): DBAdapter {
  switch (type) {
    case 'postgres':
      return new PostgresAdapter(config);
    case 'mysql':
      return new MySQLAdapter(config);
    case 'mongodb':
      return new MongoDBAdapter(config);
    case 'firebase':
      return new FirebaseAdapter(config);
    case 'supabase':
      return new SupabaseAdapter(config);
    default:
      throw new Error(`Unsupported DB type: ${type}`);
  }
}
