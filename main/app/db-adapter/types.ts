export type DBType =
  | 'postgres'
  | 'mysql'
  | 'mongodb'
  | 'mariadb'
  | 'supabase'
  | 'firebase';

export interface ColumnDef {
  is_primary: boolean | undefined;
  unique: boolean;
  name: string;
  type: string;
  primary_key?: boolean;
  nullable?: boolean;
  default?: any;
  foreign_key?: {
    references: string;
    on_delete?: string;
  };
}

export interface DBConfig {
  type: DBType;
  host?: string;
  port?: number | string;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  firebaseDbType?: 'firestore' | 'realtime';
  firebaseConfigJson?: string;
  serviceRoleKey?: string;
  full_name?: string;
  [key: string]: any;
}

export interface DBAdapter {
  testConnection?(): Promise<{ success: boolean; message: string }>;
  createTable?(tableName: string, schema: any): Promise<any>;
  create?(config: DBConfig, collection: string, data: any): Promise<any>;
  read?(config: DBConfig, collection: string, query?: any): Promise<any>;
  update?(config: DBConfig, collection: string, id: string, data: any): Promise<any>;
  delete?(config: DBConfig, collection: string, id: string): Promise<any>;

  createTenant?(config: DBConfig, data: any): Promise<any>;
  createProject?(config: DBConfig, data: any): Promise<any>;
  registerUserInAuth?(config: DBConfig, data: any): Promise<{ id?: string; uid?: string }>;
  createAdminUser?(config: DBConfig, data: any): Promise<any>;
  hashPassword?(password: string): Promise<string>;
  findUserByEmail?(config: DBConfig, email: string): Promise<any | null>;
  findProjectByOwnerId?(config: DBConfig, ownerId: string): Promise<any | null>;
  findTenantByUserEmail?(config: DBConfig, email: string): Promise<any | null>;
}
