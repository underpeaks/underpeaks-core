import { DBConfig, DBAdapter, DBType } from './types';
import { PostgresAdapter } from './adapters/postgres-adapter';
import { MongoDBAdapter } from './adapters/mongodb-adapter';
import { FirebaseAdapter } from './adapters/firebase-adapter';
import { SupabaseAdapter } from './adapters/supabase-adapter';
import { MySQLAdapter } from './adapters/mysql-adapter';

export function getAdapter(type: DBType, config: DBConfig): DBAdapter {
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
      if (!config.supabaseUrl || !config.anonKey) {
        throw new Error('SupabaseAdapter requires both supabaseUrl and anonKey in config');
      }
      return new SupabaseAdapter(config);
    default:
      throw new Error(`Unsupported DB type: ${type}`);
  }
}
