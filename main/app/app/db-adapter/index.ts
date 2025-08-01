// /lib/db-adapter/index.ts
import { DBConfig, DBAdapter } from './types';
import { PostgresAdapter } from './adapters/postgres-adapter';
import { MySQLAdapter } from './adapters/mysql-adapter';
import { SQLServerAdapter } from './adapters/sqlserver-adapter';
import { MongoDBAdapter } from './adapters/mongodb-adapter';
import { FirebaseAdapter } from './adapters/firebase-adapter';
import { SupabaseAdapter } from './adapters/supabase-adapter';
import { MariaDBAdapter } from './adapters/mariadb-adapter';
import { PlanetScaleAdapter } from './adapters/planetscale-adapter';

export function getAdapter(type: string, config: DBConfig): DBAdapter {
   switch (type) {
    case 'postgres':
      return new PostgresAdapter(config);
    case 'mysql':
      return new MySQLAdapter(config);
    case 'sqlserver':
      return new SQLServerAdapter(config);
    case 'mongodb':
      return new MongoDBAdapter(config);
    case 'firebase':
      return new FirebaseAdapter(config);
    case 'supabase':
      return new SupabaseAdapter(config);
    case 'mariadb':
      return new MariaDBAdapter(config);
    case 'planetscale':
      return new PlanetScaleAdapter(config);
    default:
      throw new Error(`Unsupported DB type: ${config.dbType}`);
  }
}
