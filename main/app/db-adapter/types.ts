export type DBType =
  | 'postgres'
  | 'mysql'
  | 'mongodb'
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
  /** Token system */
  createToken(data: {
    token_id: string;
    user_id: string;
    project_id: string;
    access_token_hash: string;
    refresh_token_hash: string;
    access_expires_at: Date;
    refresh_expires_at: Date;
    revoked: boolean;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: Date;
    updated_at: Date;
  }): Promise<any>;

  findTokenByAccessToken(
    accessTokenHash: string
  ): Promise<any | null>;

  findTokenByRefreshToken(
    refreshTokenHash: string
  ): Promise<any | null>;

  extendToken(
    tokenId: string,
    data: {
      access_expires_at: Date;
      refresh_expires_at: Date;
      updated_at?: Date;
    }
  ): Promise<any>;

  revokeToken(tokenId: string): Promise<void>;

  /** Data models */
  createDataModelsFromUserEmail: any;
  createDataModels?(): Promise<any>;

  /** Basic CRUD */
  testConnection?(): Promise<{ success: boolean; message: string }>;
  createTable?(tableName: string, schema: any): Promise<any>;
  create?(config: DBConfig, collection: string, data: any): Promise<any>;
  read?(config: DBConfig, collection: string, query?: any): Promise<any>;
  update?(config: DBConfig, collection: string, id: string, data: any): Promise<any>;
  delete?(config: DBConfig, collection: string, id: string): Promise<any>;

  /** Tenant & Project */
  createTenant?(config: DBConfig, data: any): Promise<any>;
  createProject?(config: DBConfig, data: any): Promise<any>;

  /** Auth */
  registerUserInAuth?(config: DBConfig, data: any): Promise<{ id?: string; uid?: string }>;
  createAdminUser?(config: DBConfig, data: any): Promise<any>;
  hashPassword?(password: string): Promise<string>;
  findUserByEmail?(config: DBConfig, email: string): Promise<any | null>;
  findProjectByOwnerId?(config: DBConfig, ownerId: string): Promise<any | null>;
  findTenantByUserEmail?(config: DBConfig, email: string): Promise<any | null>;

  /** Storage */
  createBucket?(bucketName: string): Promise<void>;
  listBuckets?(): Promise<string[]>;
  deleteBucket?(bucketName: string): Promise<void>;
  setupStorageBuckets?(): Promise<string[] | { success: boolean; buckets: string[] }>;
}
