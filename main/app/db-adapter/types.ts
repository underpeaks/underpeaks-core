/**
 * types.ts — Shared Type Definitions
 *
 * This file is the single source of truth for all shared TypeScript types
 * and interfaces used across the database adapter layer.
 *
 * Think of this file as a "contract document" — it defines the exact shape
 * that data and objects must have throughout the system. Any file that works
 * with database adapters, column definitions, or storage files imports its
 * types from here.
 *
 * ─── What is defined here ─────────────────────────────────────────────────
 *
 * DBType
 *   A union of all supported database type strings. Adding a new database
 *   to the system starts here.
 *
 * ColumnDef
 *   The shape of a single database column definition. Used when creating
 *   tables or normalising schema files.
 *
 * DBConfig
 *   The connection configuration object passed to every adapter method.
 *   Contains credentials and connection details for the target database.
 *
 * StorageFile
 *   The shape of a file record returned by storage adapter methods.
 *
 * DBAdapter
 *   The main interface that every database adapter must implement (fully
 *   or partially). All methods are optional so adapters can implement only
 *   the capabilities relevant to their database technology.
 */

// ---------------------------------------------------------------------------
// DBType
// ---------------------------------------------------------------------------

/**
 * DBType
 *
 * A union type listing every database technology the system supports.
 * This is used by `getAdapter()` in `index.ts` to select the correct
 * adapter class, and by `DBConfig` to identify the connection type.
 *
 * To add a new database type:
 * 1. Add its string literal to this union (e.g. `| 'redis'`).
 * 2. Create a corresponding adapter in `./adapters/`.
 * 3. Add a case for it in the `getAdapter` switch statement.
 */
export type DBType = 'postgres' | 'mysql' | 'mongodb' | 'supabase' | 'firebase';

// ---------------------------------------------------------------------------
// ColumnDef
// ---------------------------------------------------------------------------

/**
 * ColumnDef
 *
 * Describes the definition of a single column in a database table.
 * Used by adapter methods like `createTable` and by utilities like
 * `normalizeColumns` to represent schema structure in a consistent way.
 *
 * ─── Fields ───────────────────────────────────────────────────────────────
 *
 * name         — The column's name as it appears in the database table.
 *
 * type         — The data type of the column (e.g. 'uuid', 'text',
 *                'integer', 'boolean', 'timestamp'). The exact values
 *                accepted depend on the target database adapter.
 *
 * is_primary   — Whether this column is the primary key. Preferred field
 *                name. Defaults to false if omitted.
 *
 * primary_key  — Legacy alias for `is_primary`. Supported so older schema
 *                files continue to work without migration.
 *
 * unique       — Whether the column has a unique constraint, preventing
 *                duplicate values. Defaults to false if omitted.
 *
 * nullable     — Whether the column allows NULL values. Defaults to true
 *                (nullable) if omitted.
 *
 * default      — The default value to use when no value is provided on
 *                insert. Can be any type depending on the column type.
 *
 * foreign_key  — Optional foreign key constraint linking this column to
 *                another table's column.
 *
 *   references — The target in "table(column)" format,
 *                e.g. "nxf_users(user_id)".
 *   on_delete  — Behaviour when the referenced row is deleted.
 *                Common values: 'CASCADE', 'SET NULL', 'RESTRICT'.
 *
 * arrayType    — For array-typed columns (e.g. in PostgreSQL), specifies
 *                the type of each array element (e.g. 'text', 'integer').
 */
export interface ColumnDef {
  name:         string;
  type:         string;
  is_primary?:  boolean;
  primary_key?: boolean;
  unique?:      boolean;
  nullable?:    boolean;
  default?:     any;
  foreign_key?: {
    references: string;
    on_delete?: string;
  };
  arrayType?:   string;
}

// ---------------------------------------------------------------------------
// DBConfig
// ---------------------------------------------------------------------------

/**
 * DBConfig
 *
 * The connection configuration object passed into every adapter method.
 * It carries all the information needed to connect to and authenticate
 * against the target database.
 *
 * Not all fields are required for every database type — each adapter reads
 * only the fields relevant to its technology. Fields irrelevant to a given
 * adapter are safely ignored.
 *
 * ─── Common fields ────────────────────────────────────────────────────────
 *
 * type             — The database type. Must match a value in DBType.
 *                    Used by `getAdapter` to select the correct adapter.
 *
 * host             — The hostname or IP address of the database server.
 *                    Used by: postgres, mysql, mongodb.
 *
 * port             — The port number the database listens on.
 *                    Used by: postgres (5432), mysql (3306), mongodb (27017).
 *
 * database         — The name of the specific database/schema to connect to.
 *
 * user             — The database username for authentication.
 *
 * password         — The database password for authentication.
 *
 * connectionString — A full connection URI, used as an alternative to
 *                    providing host/port/user/password separately.
 *                    Example: "postgresql://user:pass@host:5432/dbname"
 *
 * databaseName     — Alternative field for the database name, used by
 *                    some adapters (e.g. MongoDB).
 *
 * full_name        — Optional display name, sometimes stored alongside
 *                    the config for user-facing features.
 *
 * [key: string]    — Index signature allowing additional adapter-specific
 *                    fields to be added without breaking the interface.
 *
 * ─── Firebase-specific fields ─────────────────────────────────────────────
 *
 * firebaseDbType      — Which Firebase database to use:
 *                        'firestore' (document DB) or 'realtime' (JSON tree DB).
 *
 * firebaseConfigJson  — The Firebase project config as a JSON string,
 *                        copied from the Firebase console.
 *
 * ─── Supabase-specific fields ─────────────────────────────────────────────
 *
 * serviceRoleKey  — The Supabase service role key (has admin-level access).
 *                   Used for server-side operations that bypass Row Level Security.
 *
 * supabaseUrl     — The base URL of the Supabase project,
 *                   e.g. "https://xyz.supabase.co".
 *
 * supabaseKey     — The Supabase public anon key, used for client-side
 *                   operations that respect Row Level Security.
 */
export interface DBConfig {
  type:               DBType;
  host?:              string;
  port?:              number | string;
  database?:          string;
  user?:              string;
  password?:          string;
  connectionString?:  string;
  databaseName?:      string;
  full_name?:         string;

  // Firebase
  firebaseDbType?:    'firestore' | 'realtime';
  firebaseConfigJson?: string;

  // Supabase
  serviceRoleKey?:    string;
  supabaseUrl?:       string;
  anonKey?:   string;

  [key: string]:      any;
}

// ---------------------------------------------------------------------------
// StorageFile
// ---------------------------------------------------------------------------

/**
 * StorageFile
 *
 * Represents a single file record returned by storage adapter methods
 * such as `listFiles` and `uploadFile`.
 *
 * This provides a consistent shape regardless of which storage backend
 * is in use (e.g. Supabase Storage, Firebase Storage, local disk).
 *
 * ─── Fields ───────────────────────────────────────────────────────────────
 *
 * id          — Unique identifier for the file record.
 *
 * name        — The file's display name (e.g. "profile-photo.png").
 *
 * url         — The publicly accessible URL to download or view the file.
 *
 * size        — The file size as a human-readable string (e.g. "2.4 MB").
 *
 * mimeType    — The MIME type of the file (e.g. "image/png", "application/pdf").
 *
 * folder      — The top-level folder/bucket the file belongs to.
 *
 * folderPath  — The full path within the storage system, including
 *               any nested subdirectories (e.g. "uploads/avatars/user-123").
 *
 * uploaded    — The upload timestamp as an ISO 8601 string.
 *
 * project_id  — Optional. Links the file to a specific project.
 *               Made optional so existing adapter methods that predate
 *               this field do not break.
 *
 * dimensions  — Optional. For image files, the pixel dimensions as a
 *               string (e.g. "1920x1080").
 */
export interface StorageFile {
  id:           string;
  name:         string;
  url:          string;
  size:         string;
  mimeType:     string;
  folder:       string;
  folderPath:   string;
  uploaded:     string;
  project_id?:  string;
  dimensions?:  string;
}

// ---------------------------------------------------------------------------
// DBAdapter
// ---------------------------------------------------------------------------

/**
 * DBAdapter
 *
 * The main interface that every database adapter class must conform to.
 *
 * ─── Design principles ────────────────────────────────────────────────────
 *
 * All methods are optional (marked with `?`). This is intentional:
 * different database technologies support different capabilities. For
 * example, Firebase has built-in authentication while PostgreSQL does not.
 * Making all methods optional allows each adapter to implement only what
 * its database actually supports, without forcing empty stub methods.
 *
 * The index signature `[key: string]: any` at the bottom allows adapters
 * to expose additional database-specific methods beyond what this interface
 * defines, without TypeScript raising an error.
 *
 * ─── Method groups ────────────────────────────────────────────────────────
 *
 * The methods are grouped by concern. See each section's comment for details.
 */
export interface DBAdapter {

  // ─── General ─────────────────────────────────────────────────────────────

  /**
   * supportsBuiltInAuth
   * A flag indicating whether this adapter uses the database's own
   * authentication system (e.g. Supabase Auth, Firebase Auth) rather than
   * the application's custom token-based auth.
   * Read this flag before deciding which login/register flow to use.
   */
  supportsBuiltInAuth?: boolean;

  /**
   * testConnection
   * Verifies that the adapter can successfully reach and authenticate
   * against the target database. Useful during setup and health checks.
   *
   * @returns An object with `success` (boolean) and a human-readable `message`.
   */
  testConnection?(): Promise<{ success: boolean; message: string }>;

  // ─── Basic Auth ───────────────────────────────────────────────────────────

  /**
   * getUserById
   * Retrieves a user record from the auth system by their unique ID.
   *
   * @param uid - The user's unique identifier.
   * @returns   An object containing the `user` record, or an `error` string.
   */
  getUserById?(uid: string): Promise<{ user?: any; error?: string }>;

  /**
   * login
   * Authenticates a user with email and password using the adapter's
   * built-in auth system. Used by adapters like Supabase and Firebase
   * that manage sessions natively.
   *
   * @param config   - DB connection config.
   * @param email    - The user's email address.
   * @param password - The user's plain-text password.
   * @returns        An object with the authenticated `user`, or an `error`.
   */
  login?(
    config: DBConfig,
    email: string,
    password: string
  ): Promise<{ user?: any; error?: string }>;

  /**
   * logout
   * Ends the current user session. For token-based adapters, this may
   * involve revoking the token on the server.
   *
   * @param config - DB connection config.
   * @param token  - Optional session token to revoke.
   * @returns      An object with a `success` boolean.
   */
  logout?(config: DBConfig, token?: string): Promise<{ success: boolean }>;

  /**
   * getCurrentUser
   * Returns the currently authenticated user for the given session token,
   * or null if the session is invalid or expired.
   *
   * @param config - DB connection config.
   * @param token  - Optional session token to validate.
   * @returns      The user object, or null.
   */
  getCurrentUser?(config: DBConfig, token?: string): Promise<any | null>;

  // ─── Token login (DB-specific) ────────────────────────────────────────────

  /**
   * loginWithMongo / loginWithMySQL / loginWithPostgres
   *
   * Database-specific login methods that implement the application's own
   * token-based authentication (as opposed to built-in auth).
   *
   * These methods are called by the auth routing layer when the adapter's
   * `supportsBuiltInAuth` flag is false. They handle password verification,
   * token creation, and session tracking internally.
   *
   * @param config     - DB connection config.
   * @param email      - The user's email address.
   * @param password   - The user's plain-text password.
   * @param projectId  - Optional. Scopes the session to a specific project.
   * @param ipAddress  - Optional. Logged for audit/security purposes.
   * @param userAgent  - Optional. Logged for audit/security purposes.
   *
   * @returns An object containing:
   *   - success      — Whether login succeeded.
   *   - user         — The authenticated user record (if successful).
   *   - accessToken  — Short-lived JWT for API requests.
   *   - refreshToken — Long-lived token used to obtain new access tokens.
   *   - error        — Error message if login failed.
   */
  loginWithMongo?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success:       boolean;
    user?:         any;
    accessToken?:  string;
    refreshToken?: string;
    error?:        string;
  }>;

  loginWithMySQL?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success:       boolean;
    user?:         any;
    accessToken?:  string;
    refreshToken?: string;
    error?:        string;
  }>;

  loginWithPostgres?(
    config: DBConfig,
    email: string,
    password: string,
    projectId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success:       boolean;
    user?:         any;
    accessToken?:  string;
    refreshToken?: string;
    error?:        string;
  }>;

  /**
   * loginWithSupabase
   * Authenticates a user through the Supabase Auth API.
   * Also logs the IP address and user agent for security auditing.
   *
   * @param config - DB connection config (must include supabaseUrl + supabaseKey).
   * @param email  - The user's email address.
   * @param password - The user's plain-text password.
   * @param ip     - Optional. The client's IP address for audit logging.
   * @param ua     - Optional. The client's User-Agent string for audit logging.
   */
  loginWithSupabase?(
    config: DBConfig,
    email: string,
    password: string,
    ip?: string,
    ua?: string
  ): Promise<any>;

  /**
   * signInWithEmailPassword
   * A generic email/password sign-in method used by adapters that have
   * built-in auth but don't fit the more specific login methods above.
   */
  signInWithEmailPassword?(
    config: DBConfig,
    email: string,
    password: string
  ): Promise<any>;

  /**
   * validateBuiltInSession
   * Checks whether a given session token is still valid according to the
   * adapter's built-in auth system (e.g. Supabase JWT validation).
   *
   * @param config - DB connection config.
   * @param token  - The session token to validate.
   * @returns      The user associated with the token, or null if invalid.
   */
  validateBuiltInSession?(config: DBConfig, token: string): Promise<any | null>;

  // ─── Register ─────────────────────────────────────────────────────────────

  /**
   * register
   * Creates a new user account using the adapter's standard registration flow.
   *
   * @param config - DB connection config.
   * @param data   - The new user's email, password, and optional display name.
   * @returns      An object with the new user's ID (`userId` or `uid`),
   *               or an `error` string if registration failed.
   */
  register?(
    config: DBConfig,
    data: { email: string; password: string; full_name?: string }
  ): Promise<{ userId?: string; uid?: string; error?: string }>;

  /**
   * registerMongoUser
   * MongoDB-specific registration that also handles email verification token
   * generation as part of the sign-up flow.
   *
   * @param config - DB connection config.
   * @param data   - Registration data including optional email verification fields.
   * @returns      An object with success status, the new user's ID, a project ID,
   *               and a session token — or an error string.
   */
  registerMongoUser?(
    config: DBConfig,
    data: {
      email:                      string;
      password:                   string;
      full_name?:                 string;
      email_verified?:            boolean;
      email_verification_token?:  string;
      email_verification_ttl?:    string;
    }
  ): Promise<{
    success:     boolean;
    user_id?:    string;
    project_id?: string;
    token?:      string;
    error?:      string;
  }>;

  /**
   * registerUserInAuth
   * Creates a user record in the adapter's auth system (e.g. Supabase Auth).
   * Returns the new user's ID in whichever field the auth provider uses.
   *
   * @param config - DB connection config.
   * @param data   - User data to register (email, password, metadata, etc.)
   * @returns      An object with the new user's `id` or `uid`.
   */
  registerUserInAuth?(
    config: DBConfig,
    data: any
  ): Promise<{ id?: string; uid?: string }>;

  /**
   * registerUserInSupabase
   * Registers a user specifically in Supabase Auth.
   *
   * @param config - DB connection config.
   * @param data   - User registration data.
   * @returns      An object with the new user's `id`.
   */
  registerUserInSupabase?(
    config: DBConfig,
    data: any
  ): Promise<{ id?: string }>;

  /**
   * registerSupabaseUser
   * Full Supabase registration flow that also returns an email verification
   * link to send to the new user.
   *
   * @param config - DB connection config.
   * @param data   - Email, password, and full display name.
   * @returns      An object with the new user's `id` and optional
   *               `verificationLink` to send via email.
   */
  registerSupabaseUser?(
    config: DBConfig,
    data: { email: string; password: string; full_name: string }
  ): Promise<{ id?: string; verificationLink?: string }>;

  // ─── Password Reset ───────────────────────────────────────────────────────

  /**
   * sendResetEmail
   * Sends a password reset email to the given address. The email contains
   * a link that redirects the user to `redirectUrl` with a reset token.
   *
   * @param config       - DB connection config.
   * @param email        - The email address to send the reset link to.
   * @param redirectUrl  - Optional URL to include in the reset link.
   * @returns            Success flag and optional error string.
   */
  sendResetEmail?(
    config: DBConfig,
    email: string,
    redirectUrl?: string
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * resetPassword
   * Applies a new password using a previously issued reset token.
   * The token is validated before the password is updated.
   *
   * @param config       - DB connection config.
   * @param token        - The password reset token from the email link.
   * @param newPassword  - The new plain-text password to set.
   * @returns            Success flag and optional error string.
   */
  resetPassword?(
    config: DBConfig,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * createPasswordResetToken
   * Generates and stores a password reset token for the given email address.
   * The token is typically emailed to the user as part of a reset link.
   *
   * @param email - The user's email address.
   * @returns     The generated reset token string.
   */
  createPasswordResetToken?(email: string): Promise<string>;

  /**
   * findUserByToken
   * Looks up a user record by their password reset token.
   * Used during the reset flow to verify the token is valid and not expired.
   *
   * @param token - The reset token to look up.
   * @returns     The matching user record, or null if not found/expired.
   */
  findUserByToken?(token: string): Promise<any | null>;

  /**
   * updatePasswordByToken
   * Updates a user's password using their reset token as the lookup key.
   * Should invalidate the token after use to prevent reuse.
   *
   * @param token       - The reset token identifying the user.
   * @param newPassword - The new plain-text password to hash and store.
   * @returns           The updated user record, or null on failure.
   */
  updatePasswordByToken?(token: string, newPassword: string): Promise<any | null>;

  /**
   * verifyEmail
   * Marks a user's email address as verified using the token they received
   * in their verification email.
   *
   * @param config - DB connection config.
   * @param data   - The verification token, and optionally the user's email.
   * @returns      An object with a `success` boolean.
   */
  verifyEmail?(
    config: DBConfig,
    data: { token: string; email?: string }
  ): Promise<{ success: boolean }>;

  // ─── Token System ─────────────────────────────────────────────────────────

  /**
   * createToken
   * Creates a new access/refresh token pair and persists it to the database.
   * Used by the custom token-based auth flow (non-built-in auth adapters).
   *
   * @param data - Token payload data (user ID, expiry, scopes, etc.)
   * @returns    The created token record.
   */
  createToken?(data: any): Promise<any>;

  /**
   * findTokenByAccessToken
   * Looks up a token record by the hashed access token.
   * Used to validate incoming API requests.
   *
   * @param hash - The hashed access token string.
   * @returns    The matching token record, or null if not found/expired.
   */
  findTokenByAccessToken?(hash: string): Promise<any | null>;

  /**
   * findTokenByRefreshToken
   * Looks up a token record by the hashed refresh token.
   * Used when the client requests a new access token.
   *
   * @param hash - The hashed refresh token string.
   * @returns    The matching token record, or null if not found/expired.
   */
  findTokenByRefreshToken?(hash: string): Promise<any | null>;

  /**
   * extendToken
   * Updates an existing token record — typically to extend its expiry
   * or rotate the access token value after a refresh.
   *
   * @param tokenId - The ID of the token record to update.
   * @param data    - The fields to update on the token record.
   * @returns       The updated token record.
   */
  extendToken?(tokenId: string, data: any): Promise<any>;

  /**
   * revokeToken
   * Permanently invalidates a token, preventing it from being used again.
   * Called on logout or when a security issue is detected.
   *
   * @param tokenId - The ID of the token record to revoke.
   */
  revokeToken?(tokenId: string): Promise<void>;

  /**
   * hashPassword
   * Hashes a plain-text password using the adapter's chosen algorithm
   * (typically bcrypt). The resulting hash is safe to store in the database.
   *
   * @param password - The plain-text password to hash.
   * @returns        The hashed password string.
   */
  hashPassword?(password: string): Promise<string>;

  /**
   * comparePassword
   * Compares a plain-text password against a stored hash to verify a login.
   *
   * @param password - The plain-text password from the login attempt.
   * @param hash     - The stored hashed password to compare against.
   * @returns        True if the password matches, false otherwise.
   */
  comparePassword?(password: string, hash: string): Promise<boolean>;

  // ─── Data Models ──────────────────────────────────────────────────────────

  /**
   * createDataModelsFromUserEmail
   * Triggers the full data model creation flow for the project associated
   * with the given user email and project type.
   *
   * @param email               - The admin user's email address.
   * @param selectedProjectType - The project template type (e.g. 'ecommerce').
   */
  createDataModelsFromUserEmail?(
    email: string,
    selectedProjectType: string
  ): Promise<any>;

  /**
   * createDataModels
   * Creates all data models for a given project ID.
   *
   * @param projectId - The UUID of the project to create models for.
   */
 createDataModels?(projectId: string, selectedProjectType?: string): Promise<any>;

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * findSystemConfigByUserId
   * Retrieves the system configuration record associated with a specific user.
   * Used to load persisted installer settings after initial setup.
   *
   * @param config - DB connection config.
   * @param userId - The user's unique identifier.
   * @returns      The config record, or null if not found.
   */
  findSystemConfigByUserId?(config: DBConfig, userId: string): Promise<any | null>;

  /**
   * createTable
   * Creates a new table in the target database using the provided schema
   * definition. Called during project setup to build the database structure.
   *
   * @param tableName - The name of the table to create.
   * @param schema    - The table schema including column definitions.
   */
  createTable?(tableName: string, schema: any): Promise<any>;

  /**
   * create
   * Inserts a new record into the specified collection/table.
   *
   * @param config     - DB connection config.
   * @param collection - The table or collection name to insert into.
   * @param data       - The record data to insert.
   * @returns          The created record.
   */
  create?(config: DBConfig, collection: string, data: any): Promise<any>;

  /**
   * read
   * Retrieves records from the specified collection/table, optionally
   * filtered by a query object.
   *
   * @param config     - DB connection config.
   * @param collection - The table or collection name to read from.
   * @param query      - Optional filter/query parameters.
   * @returns          The matching records.
   */
  read?(config: DBConfig, collection: string, query?: any): Promise<any>;
  readAll?(config: DBConfig, collection: string, query?: any): Promise<any>;

  /**
   * update
   * Updates an existing record in the specified collection/table.
   *
   * @param config     - DB connection config.
   * @param collection - The table or collection name.
   * @param id         - The ID value of the record to update.
   * @param data       - The fields to update.
   * @param idColumn   - Optional. The name of the ID column (defaults to 'id').
   *                     Useful when the primary key column has a non-standard name.
   * @returns          The updated record.
   */
  update?(
    config: DBConfig,
    collection: string,
    id: string,
    data: any,
    idColumn?: string
  ): Promise<any>;

  /**
   * delete
   * Deletes a record from the specified collection/table by ID.
   *
   * @param config     - DB connection config.
   * @param collection - The table or collection name.
   * @param id         - The ID of the record to delete.
   * @returns          The result of the delete operation.
   */
  delete?(config: DBConfig, collection: string, id: string, page_id?:string): Promise<any>;

  /**
   * installDemoContent
   * Seeds the database with pre-built demo data for the given project type.
   * Used during setup when the user enables the "demo content" option.
   *
   * @param config               - DB connection config.
   * @param selectedProjectType  - The project template type to seed data for.
   * @returns An object with:
   *   - success  — Whether seeding completed without errors.
   *   - message  — Optional human-readable summary.
   *   - inserted — Optional count of records inserted.
   *   - skipped  — True if seeding was skipped (e.g. already seeded).
   */
 installDemoContent(
  config: DBConfig,
  selectedProjectType: string,
  adminEmail?: string
): Promise<{ success: boolean; error?: string; inserted?: number; skipped?: boolean }>

  // ─── Tenant & Project ─────────────────────────────────────────────────────

  /**
   * createTenant
   * Creates a new tenant record in the database. A tenant represents an
   * isolated workspace identified by a subdomain.
   *
   * @param config - DB connection config.
   * @param data   - Tenant data (subdomain, user email, etc.)
   * @returns      The created tenant record or its ID.
   */
  createTenant?(config: DBConfig, data: any): Promise<any>;

  /**
   * findTenantByUserEmail
   * Looks up a tenant record by the email address of its owner.
   *
   * @param config - DB connection config.
   * @param email  - The owner's email address.
   * @returns      The tenant record, or null if not found.
   */
  findTenantByUserEmail?(config: DBConfig, email: string): Promise<any | null>;
 findTenantByUserID?(config: DBConfig, userID: string): Promise<any | null>;
  /**
   * createProject
   * Creates a new project record in the database and links it to a user.
   *
   * @param config - DB connection config.
   * @param data   - An object with the project `name` and owner `user_id`.
   * @returns      The ID of the newly created project as a string.
   */
  createProject?(
    config: DBConfig,
    data: { name: string; user_id: string; tenant_ID: string }
  ): Promise<string>;

  /**
   * findProjectByOwnerId
   * Retrieves the project record owned by the given user ID.
   *
   * @param config   - DB connection config.
   * @param ownerId  - The user ID to look up projects for.
   * @returns        The project record, or null if not found.
   */
  findProjectByOwnerId?(config: DBConfig, ownerId: string): Promise<any | null>;

  /**
   * saveInstallerConfig
   * Persists the installer configuration to the database after setup completes.
   * Allows the application to recall its own setup state on restart.
   *
   * @param config - DB connection config.
   * @param data   - The installer configuration object to save.
   * @returns      The saved config record.
   */
  saveInstallerConfig?(config: DBConfig, data: any): Promise<any>;

  // ─── Admin ────────────────────────────────────────────────────────────────

  /**
   * createAdminUser
   * Inserts the initial admin user record into the application's users table.
   * Called during the setup flow after the auth user has been registered.
   *
   * @param config - DB connection config.
   * @param data   - Admin user fields (user_id, email, full_name, role, etc.)
   * @returns      The created user record.
   */
  createAdminUser?(config: DBConfig, data: any): Promise<any>;

  /**
   * findUserByEmail
   * Looks up a user record by email address.
   * Used during setup to check whether the admin already exists.
   *
   * @param config - DB connection config.
   * @param email  - The email address to search for.
   * @returns      The user record, or null if not found.
   */
  findUserByEmail?(config: DBConfig, email: string): Promise<any | null>;

  /**
   * findUserByEmailWithRetry
   * Same as `findUserByEmail` but retries automatically on failure.
   * Useful in eventual-consistency scenarios where a freshly created user
   * may not be immediately visible to a subsequent read.
   *
   * @param config   - DB connection config.
   * @param email    - The email address to search for.
   * @param retries  - Maximum number of retry attempts (default varies by adapter).
   * @param delay    - Milliseconds to wait between retries.
   * @returns        The user record, or null if not found after all retries.
   */
  findUserByEmailWithRetry?(
    config: DBConfig,
    email: string,
    retries?: number,
    delay?: number
  ): Promise<any | null>;

  /**
 * generateEmailVerificationLink
 * Generates a one-time email verification link for the given address.
 * Firebase: uses Admin SDK generateEmailVerificationLink.
 * Other DB types: generate a token, store it, return a /verify-email URL.
 *
 * @param config      - DB connection config.
 * @param email       - The email address to generate a link for.
 * @param redirectUrl - URL to redirect to after verification.
 */
generateEmailVerificationLink?(
  config:       DBConfig,
  email:        string,
  redirectUrl?: string
): Promise<string>

  // ─── Storage Buckets ──────────────────────────────────────────────────────

  /**
   * createBucket
   * Creates a new storage bucket with the given name.
   * Buckets are top-level containers for files (similar to S3 buckets).
   *
   * @param bucketName - The name to give the new bucket.
   */
  createBucket?(bucketName: string): Promise<void>;

  /**
   * listBuckets
   * Returns the names of all existing storage buckets.
   *
   * @returns An array of bucket name strings.
   */
  listBuckets?(): Promise<string[]>;

  /**
   * deleteBucket
   * Permanently deletes a storage bucket and all its contents.
   *
   * @param bucketName - The name of the bucket to delete.
   */
  deleteBucket?(bucketName: string): Promise<void>;

  /**
   * setupStorageBuckets
   * Runs the full storage bucket initialisation flow, creating all buckets
   * the application needs. Called once during project setup.
   *
   * @returns Either an array of created bucket names, or an object with
   *          a `success` flag and the list of bucket names.
   */
  setupStorageBuckets?(): Promise<string[] | { success: boolean; buckets: string[] }>;

  // ─── Storage Files ────────────────────────────────────────────────────────

  /**
   * listFolders
   * Returns the names of all top-level folders in the storage system.
   *
   * @returns An array of folder name strings.
   */
  listFolders?(): Promise<string[]>;

  /**
   * listFiles
   * Returns all file records within the specified folder.
   *
   * @param folder - The folder name to list files from.
   * @returns      An array of StorageFile objects.
   */
  listFiles?(folder: string): Promise<StorageFile[]>;

  /**
   * uploadFile
   * Uploads a file to the specified folder in storage.
   *
   * @param folder    - The destination folder name.
   * @param fileName  - The name to save the file as.
   * @param buffer    - The raw file content as a Node.js Buffer.
   * @param mimeType  - The MIME type of the file (e.g. 'image/png').
   * @returns         The public URL of the uploaded file.
   */
  uploadFile?(
    folder: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string>;

  /**
   * deleteFile
   * Permanently deletes a file from storage.
   *
   * @param folder    - The folder the file lives in.
   * @param fileName  - The name of the file to delete.
   */
  deleteFile?(folder: string, fileName: string): Promise<void>;

  /**
   * deleteFolder
   * Deletes an entire folder and all files within it.
   *
   * @param folder - The name of the folder to delete.
   */
  deleteFolder?(folder: string): Promise<void>;

  /**
   * createFolder
   * Creates a new empty folder in the storage system.
   *
   * @param folder - The name of the folder to create.
   */
  createFolder?(folder: string): Promise<void>;

  /**
   * importFromUrl
   * Downloads a file from a remote URL and saves it into the specified folder.
   * Useful for importing assets from external sources during setup or seeding.
   *
   * @param folder - The destination folder name.
   * @param url    - The remote URL to download the file from.
   * @returns      A StorageFile record for the imported file.
   */
  importFromUrl?(folder: string, url: string): Promise<StorageFile>;

  /**
   * deleteStorageRecordByFilePath
   * Removes the database record associated with a file at the given path,
   * without necessarily deleting the physical file from storage.
   * Used to clean up orphaned metadata records.
   *
   * @param filePath - The full storage path of the file record to remove.
   */
  deleteStorageRecordByFilePath?(filePath: string): Promise<void>;

  /**
   * renameFile
   * Renames a file within its current folder.
   *
   * @param folder   - The folder the file lives in.
   * @param oldName  - The current file name.
   * @param newName  - The new file name to rename it to.
   */
  renameFile?(folder: string, oldName: string, newName: string): Promise<void>;

  /**
   * moveFile
   * Moves a file from one folder to another within the storage system.
   *
   * @param fromFolder - The folder the file currently lives in.
   * @param toFolder   - The destination folder to move it to.
   * @param fileName   - The name of the file to move.
   */
  moveFile?(fromFolder: string, toFolder: string, fileName: string): Promise<void>;

  // Add these to the DBAdapter interface in types.ts

/** ------------------- MODEL MANAGEMENT ------------------- */
alterTable?(tableName: string, changes: {
  add?:    ColumnDef[]
  drop?:   string[]
  rename?: { from: string; to: string }
}): Promise<any>

dropTable?(tableName: string): Promise<any>

renameTable?(oldName: string, newName: string): Promise<any>


//MESSAGES
deleteConversation?(
  config:         DBConfig,
  conversationId: string
): Promise<{ success: boolean }>

/**
 * listConversations
 * Fetches the most recent conversations for a project, with unread count
 * per conversation for the given user.
 *
 * @param config     - DB connection config.
 * @param project_id - The project to scope conversations to.
 * @param uid        - The user ID to calculate unread counts for.
 * @param limit      - Max number of conversations to return (default 10).
 */
listConversations?(
  config:     DBConfig,
  project_id: string,
  uid:        string,
  limit?:     number
): Promise<Array<Record<string, any>>>

/**
 * markAllMessagesRead
 * Marks all unread messages for a given user as read in a single atomic operation.
 *
 * @param config - DB connection config.
 * @param uid    - The recipient user ID whose unread messages to mark as read.
 */
markAllMessagesRead?(
  config: DBConfig,
  uid:    string
): Promise<{ success: boolean }>

/**
 * markConversationRead
 * Marks all unread messages in a specific conversation as read for a given user.
 *
 * @param config          - DB connection config.
 * @param uid             - The recipient user ID.
 * @param conversationId  - The conversation to mark as read.
 */
markConversationRead?(
  config:         DBConfig,
  uid:            string,
  conversationId: string
): Promise<{ success: boolean }>

/**
 * sendMessage
 * Creates a new message in a conversation and updates the conversation
 * with the latest message preview and timestamp.
 *
 * @param config          - DB connection config.
 * @param conversationId  - The conversation to post the message to.
 * @param senderId        - The authenticated user sending the message.
 * @param content         - The text body of the message.
 * @returns The full saved message object.
 */
sendMessage?(
  config:         DBConfig,
  conversationId: string,
  senderId:       string,
  content:        string
): Promise<Record<string, any>>

/**
 * getConversationThread
 * Fetches all messages in a conversation ordered chronologically (oldest first).
 *
 * @param config          - DB connection config.
 * @param conversationId  - The conversation to fetch messages for.
 * @returns Array of message objects sorted by sent_at ascending.
 */
getConversationThread?(
  config:         DBConfig,
  conversationId: string
): Promise<Array<Record<string, any>>>

///NOTIFICATIONS

/**
 * listNotifications
 * Fetches active (non-deleted) notifications for a user, ordered by status
 * then by creation date descending.
 *
 * @param config  - DB connection config.
 * @param uid     - The recipient user ID to fetch notifications for.
 * @param limit   - Max number of notifications to return (default 20).
 */
listNotifications?(
  config:     DBConfig,
  uid:        string,
  project_id: string,
  limit?:     number
): Promise<Array<Record<string, any>>>

/**
 * markNotificationRead
 * Marks a single notification as read, verifying the requesting user owns it.
 *
 * @param config          - DB connection config.
 * @param notificationId  - The notification document ID to mark as read.
 * @param uid             - The authenticated user — must match the notification's user_id.
 */
markNotificationRead?(
  config:         DBConfig,
  notificationId: string,
  uid:            string
): Promise<{ success: boolean }>

/**
 * markAllNotificationsRead
 * Marks all unread notifications for a user within a project as read
 * in a single atomic operation.
 *
 * @param config     - DB connection config.
 * @param uid        - The authenticated user ID.
 * @param project_id - The project to scope the update to.
 */
markAllNotificationsRead?(
  config:     DBConfig,
  uid:        string,
  project_id: string
): Promise<{ success: boolean; updated: number }>

/**
 * listApiKeys
 * Fetches all active API keys for a project, ordered newest first.
 * Returns safe fields only — key_encrypted is never included.
 *
 * @param config     - DB connection config.
 * @param project_id - The project to fetch keys for.
 */
listApiKeys?(
  config:     DBConfig,
  project_id: string
): Promise<Array<{
  api_id:       string
  name:         string
  key_prefix:   string
  status:       string
  last_used_at: string | null
  created_at:   string
}>>

/**
 * getApiKey
 * Fetches a single API key record by its document ID.
 * Returns the full record including key_encrypted for server-side decryption.
 * Never expose key_encrypted in API responses — server use only.
 *
 * @param config - DB connection config.
 * @param api_id - The document ID of the key record.
 */
getApiKey?(
  config: DBConfig,
  api_id: string
): Promise<Record<string, any> | null>

/**
 * revokeApiKey
 * Marks an API key as revoked after verifying it belongs to the given project.
 * Soft-delete only — record is kept for audit trail.
 *
 * @param config     - DB connection config.
 * @param api_id     - The document ID of the key to revoke.
 * @param project_id - The project that must own the key (IDOR protection).
 */
revokeApiKey?(
  config:     DBConfig,
  api_id:     string,
  project_id: string
): Promise<{ success: boolean }>

  // ─── Extensibility ────────────────────────────────────────────────────────

  /**
   * Index signature — allows adapters to expose additional methods beyond
   * those defined in this interface without causing TypeScript errors.
   * Keeps the interface open for adapter-specific extensions.
   */
  [key: string]: any;
}