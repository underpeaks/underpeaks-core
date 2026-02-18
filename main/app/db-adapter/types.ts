export type DBType =
  | 'postgres'
  | 'mysql'
  | 'mongodb'
  | 'supabase'
  | 'firebase'

export interface ColumnDef {
  is_primary?: boolean
  unique?: boolean
  name: string
  type: string
  primary_key?: boolean
  nullable?: boolean
  default?: any
  foreign_key?: {
    references: string
    on_delete?: string
  }
}

export interface DBConfig {
  type: DBType
  host?: string
  port?: number | string
  database?: string
  user?: string
  password?: string
  connectionString?: string

  // Firebase
  firebaseDbType?: 'firestore' | 'realtime'
  firebaseConfigJson?: string

  // Supabase
  serviceRoleKey?: string
  supabaseUrl?: string
  supabaseKey?: string

  full_name?: string
  [key: string]: any
}

export interface DBAdapter {
  /** Firebase/Supabase built-in auth support */
  supportsBuiltInAuth?: boolean

  /* BASIC LOGIN (used by SQL/Mongo) */
  login?(
    config: DBConfig,
    email: string,
    password: string
  ): Promise<{ user?: any; error?: string }>

  /* MONGO TOKEN LOGIN (ONLY Mongo adapter will implement) */
  loginWithMongo?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean
    user?: any
    accessToken?: string
    refreshToken?: string
    error?: string
  }>

  /* MYSQL TOKEN LOGIN (ONLY MySQL adapter will implement) */
  loginWithMysql?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean
    user?: any
    accessToken?: string
    refreshToken?: string
    error?: string
  }>

  loginWithPostgres?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean
    user?: any
    accessToken?: string
    refreshToken?: string
    error?: string
  }>

  register?(
    config: DBConfig,
    data: { email: string; password: string; full_name?: string }
  ): Promise<{ userId?: string; uid?: string; error?: string }>

  logout?(config: DBConfig, token?: string): Promise<{ success: boolean }>

  getCurrentUser?(config: DBConfig, token?: string): Promise<any | null>

  sendResetEmail?(
    config: DBConfig,
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; error?: string }>

  resetPassword?(
    config: DBConfig,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }>

  /* Password reset helpers */
  createPasswordResetToken?(email: string): Promise<string>
  findUserByToken?(token: string): Promise<any | null>
  updatePasswordByToken?(token: string, newPassword: string): Promise<any | null>

  /* Firebase/Supabase */
  signInWithEmailPassword?(
    config: DBConfig,
    email: string,
    password: string
  ): Promise<any>

  validateBuiltInSession?(config: DBConfig, token: string): Promise<any | null>

  /* Token system (SQL/Mongo) */
  createToken?(data: any): Promise<any>
  findTokenByAccessToken?(hash: string): Promise<any | null>
  findTokenByRefreshToken?(hash: string): Promise<any | null>
  extendToken?(tokenId: string, data: any): Promise<any>
  revokeToken?(tokenId: string): Promise<void>

  hashPassword?(password: string): Promise<string>
  comparePassword?(password: string, hash: string): Promise<boolean>

  /* Data Models */
  createDataModelsFromUserEmail?(email: string): Promise<any>
  createDataModels?(projectId: string): Promise<any>

  /* CRUD */
  testConnection?(): Promise<{ success: boolean; message: string }>
  createTable?(tableName: string, schema: any): Promise<any>
  create?(config: DBConfig, collection: string, data: any): Promise<any>
  read?(config: DBConfig, collection: string, query?: any): Promise<any>
  update?(config: DBConfig, collection: string,  id: string, data: any,idColumn?: string,): Promise<any>
  delete?(config: DBConfig, collection: string, id: string): Promise<any>

  /* ------------------- MISSING FUNCTIONS ADDED ------------------- */
  saveInstallerConfig?(config: DBConfig, data: any): Promise<any>
  createProject?(config: DBConfig, data: { name: string; user_id: string }): Promise<string>
  findProjectByOwnerId?(config: DBConfig, ownerId: string): Promise<any | null>
  createAdminUser?(config: DBConfig, data: any): Promise<any>
  findUserByEmail?(config: DBConfig, email: string): Promise<any | null>
  findUserByEmailWithRetry?(
    config: DBConfig,
    email: string,
    retries?: number,
    delay?: number
  ): Promise<any | null>

  /* Tenant & Project */
  createTenant?(config: DBConfig, data: any): Promise<any>
  findTenantByUserEmail?(config: DBConfig, email: string): Promise<any | null>

  /* Admin */
  registerUserInAuth?(config: DBConfig, data: any): Promise<{ id?: string; uid?: string }>

  /* Storage */
  createBucket?(bucketName: string): Promise<void>
  listBuckets?(): Promise<string[]>
  deleteBucket?(bucketName: string): Promise<void>
  setupStorageBuckets?(): Promise<string[] | { success: boolean; buckets: string[] }>

  [key: string]: any
}
