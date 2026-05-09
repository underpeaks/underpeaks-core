export type DBType = 'postgres' | 'mysql' | 'mongodb' | 'supabase' | 'firebase';

export interface ColumnDef {
  is_primary?: boolean;
  unique?: boolean;
  name: string;
  type: string;
  primary_key?: boolean;
  nullable?: boolean;
  default?: any;
  foreign_key?: {
    references: string;
    on_delete?: string;
  };
  arrayType?: string;
}

export interface DBConfig {
  type: DBType;
  host?: string;
  port?: number | string;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  databaseName?: string;
  // Firebase
  firebaseDbType?: 'firestore' | 'realtime';
  firebaseConfigJson?: string;

  // Supabase
  serviceRoleKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;

  full_name?: string;
  [key: string]: any;
}
export interface StorageFile {
  id:          string
  name:        string
  url:         string
  size:        string
  mimeType:    string
  folder:      string
  folderPath:  string
  uploaded:    string
  project_id?: string   // ← added, optional so existing adapter methods don't break
  dimensions?: string
}
export interface DBAdapter {
  /** ------------------- GENERAL ------------------- */
  supportsBuiltInAuth?: boolean;
  testConnection?(): Promise<{ success: boolean; message: string }>;

  /** ------------------- BASIC AUTH ------------------- */
  getUserById?(uid: string):Promise<{user?:any; error?:string}>
  login?(
    config: DBConfig,
    email: string,
    password: string
  ): Promise<{ user?: any; error?: string }>;

  logout?(config: DBConfig, token?: string): Promise<{ success: boolean }>;
  getCurrentUser?(config: DBConfig, token?: string): Promise<any | null>;

  /** ------------------- TOKEN LOGIN (DB SPECIFIC) ------------------- */
  loginWithMongo?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    user?: any;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }>;

  loginWithMySQL?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    user?: any;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }>;

  loginWithPostgres?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    user?: any;
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }>;

  loginWithSupabase?(
    config: DBConfig,
    email: string,
    password: string,
    ip?: string,
    ua?: string
  ): Promise<any>;

  signInWithEmailPassword?(
    config: DBConfig,
    email: string,
    password: string
  ): Promise<any>;

  validateBuiltInSession?(config: DBConfig, token: string): Promise<any | null>;

  /** ------------------- REGISTER ------------------- */
  register?(
    config: DBConfig,
    data: { email: string; password: string; full_name?: string }
  ): Promise<{ userId?: string; uid?: string; error?: string }>;

  registerMongoUser?(
    config: DBConfig,
    data: {
      email: string;
      password: string;
      full_name?: string;
      email_verified?: boolean;
      email_verification_token?: string;
      email_verification_ttl?: string;
    }
  ): Promise<{
    success: boolean;
    user_id?: string;
    project_id?: string;
    token?: string;
    error?: string;
  }>;

  registerUserInAuth?(config: DBConfig, data: any): Promise<{ id?: string; uid?: string }>;

  registerUserInSupabase?(config: DBConfig, data: any): Promise<{ id?: string; }>;
  registerSupabaseUser?(
    config: DBConfig,
    data: { email: string; password: string; full_name: string;}):Promise<{id?: string; verificationLink?: string}>
  

  /** ------------------- PASSWORD RESET ------------------- */
  sendResetEmail?(
    config: DBConfig,
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; error?: string }>;

  resetPassword?(
    config: DBConfig,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }>;

  

  createPasswordResetToken?(email: string): Promise<string>;
  findUserByToken?(token: string): Promise<any | null>;
  updatePasswordByToken?(token: string, newPassword: string): Promise<any | null>;
 verifyEmail?(
  config: DBConfig,
  data: { token: string; email?: string }
): Promise<{ success: boolean }>

  /** ------------------- TOKEN SYSTEM ------------------- */
  createToken?(data: any): Promise<any>;
  findTokenByAccessToken?(hash: string): Promise<any | null>;
  findTokenByRefreshToken?(hash: string): Promise<any | null>;
  extendToken?(tokenId: string, data: any): Promise<any>;
  revokeToken?(tokenId: string): Promise<void>;

  hashPassword?(password: string): Promise<string>;
  comparePassword?(password: string, hash: string): Promise<boolean>;

  /** ------------------- DATA MODELS ------------------- */
  createDataModelsFromUserEmail?(email: string,selectedProjectType:string): Promise<any>;
  createDataModels?(projectId: string): Promise<any>;

  /** ------------------- CRUD ------------------- */
  findSystemConfigByUserId?(config: DBConfig, userId: string): Promise<any | null>
  createTable?(tableName: string, schema: any): Promise<any>;
  create?(config: DBConfig, collection: string, data: any): Promise<any>;
  read?(config: DBConfig, collection: string, query?: any): Promise<any>;
  update?(
    config: DBConfig,
    collection: string,
    id: string,
    data: any,
    idColumn?: string
  ): Promise<any>;
  delete?(config: DBConfig, collection: string, id: string): Promise<any>;
  installDemoContent?: (
    config: DBConfig,
    selectedProjectType: string
  ) => Promise<{
    success: boolean;
    message?: string;
    inserted?: number;
    skipped?: boolean; // ✅ FIXED
  }>;


  /** ------------------- TENANT & PROJECT ------------------- */
  createTenant?(config: DBConfig, data: any): Promise<any>;
  findTenantByUserEmail?(config: DBConfig, email: string): Promise<any | null>;

  createProject?(config: DBConfig, data: { name: string; user_id: string }): Promise<string>;
  findProjectByOwnerId?(config: DBConfig, ownerId: string): Promise<any | null>;

  saveInstallerConfig?(config: DBConfig, data: any): Promise<any>;

  /** ------------------- ADMIN ------------------- */
  createAdminUser?(config: DBConfig, data: any): Promise<any>;
  findUserByEmail?(config: DBConfig, email: string): Promise<any | null>;
  findUserByEmailWithRetry?(
    config: DBConfig,
    email: string,
    retries?: number,
    delay?: number
  ): Promise<any | null>;

  /** ------------------- STORAGE ------------------- */
  createBucket?(bucketName: string): Promise<void>;
  listBuckets?(): Promise<string[]>;
  deleteBucket?(bucketName: string): Promise<void>;
  setupStorageBuckets?(): Promise<string[] | { success: boolean; buckets: string[] }>;


/** ------------------- STORAGE FILES ------------------- */
listFolders?(): Promise<string[]>
listFiles?(folder: string): Promise<StorageFile[]>
uploadFile?(folder: string, fileName: string, buffer: Buffer, mimeType: string): Promise<string>
deleteFile?(folder: string, fileName: string): Promise<void>
deleteFolder?(folder: string): Promise<void>
createFolder?(folder: string): Promise<void>
importFromUrl?(folder: string, url: string): Promise<StorageFile>
deleteStorageRecordByFilePath?(filePath: string): Promise<void>
renameFile?(folder: string, oldName: string, newName: string): Promise<void>
moveFile?(fromFolder: string, toFolder: string, fileName: string): Promise<void>

  /** ------------------- EXTENSIBILITY ------------------- */
  [key: string]: any;
}
