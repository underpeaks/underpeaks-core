// types.ts

export type DBType =
  | 'postgres'
  | 'mysql'
  | 'sqlserver'
  | 'mongodb'
  | 'mariadb'
  | 'planetscale'
  | 'supabase'
  | 'firebase';

// ✅ Define the Type (what you're trying to import in index.ts)
export interface DBConfig {
  type: DBType;
  host?: string;
  port?: number | string;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  [key: string]: any; // to allow for extra fields like SSL, schema, etc.
}

// (optional) runtime config for testing
export const envDBConfig: DBConfig = {
  type: process.env.DB_TYPE as DBType,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};



export interface DBAdapter {
  testConnection: (config: DBConfig) => Promise<{ success: boolean; message: string }>
  create?: (config: DBConfig, table: string, data: any) => Promise<any>
  read?: (config: DBConfig, table: string, query?: string) => Promise<any>
  update?: (config: DBConfig, table: string, id: string, data: any) => Promise<any>
  delete?: (config: DBConfig, table: string, id: string) => Promise<any>
}