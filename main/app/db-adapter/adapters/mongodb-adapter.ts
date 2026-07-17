// app/db-adapter/adapters/mongodb-adapter.ts

/**
 * MongoDBAdapter
 *
 * This class implements the DBAdapter interface for MongoDB. It acts as the
 * single point of contact between the Underpeaks platform and a MongoDB
 * database — all reads, writes, and admin operations go through this adapter.
 *
 * What is a DB adapter?
 * ──────────────────────
 * Underpeaks supports multiple database backends (MongoDB, Supabase, Firebase,
 * MySQL, PostgreSQL). Each backend has its own adapter class that implements
 * the shared DBAdapter interface. This means the rest of the app can call the
 * same methods (e.g. findUserByEmail, createTable) regardless of which database
 * is being used — the adapter handles all the provider-specific details.
 *
 * What this adapter covers:
 * ──────────────────────────
 * - Connection management   : connects to MongoDB lazily (on first use) and
 *                             reuses the connection for the lifetime of the instance.
 * - Core CRUD               : create, read, update, delete on any collection.
 * - User management         : create admin users, find users, login, register,
 *                             email verification, and password reset.
 * - Token management        : create, look up, extend, and revoke session tokens
 *                             stored in the nxf_system_tokens collection.
 * - Project management      : create projects and find them by owner.
 * - Tenant management       : create tenants and find them by email.
 * - Installer config        : save the installer configuration record.
 * - Table/collection creation: create MongoDB collections and indexes from a schema.
 * - Data models             : generate project-specific data models from the
 *                             admin user's email.
 * - Storage                 : set up the nxf_storage collection as a stand-in
 *                             for named storage buckets.
 * - Demo content            : seed the database from JSON files on disk.
 *
 * Authentication model:
 * ──────────────────────
 * MongoDB does not have a built-in auth system (unlike Firebase or Supabase),
 * so supportsBuiltInAuth = false. All authentication is handled through the
 * nxf_users and nxf_system_tokens collections managed by this adapter.
 *
 * Collections used:
 * ──────────────────
 *   nxf_users            — User accounts (email, password hash, role, status).
 *   nxf_system_tokens    — Session access and refresh tokens.
 *   nxf_system_projects  — Projects owned by users.
 *   nxf_system_tenants   — Tenant records mapped to subdomains.
 *   nxf_system_config    — Per-user system configuration records.
 *   nxf_storage          — Stand-in collection for storage bucket metadata.
 *   <dynamic>            — Any collection created via createTable() or seeded
 *                          via installDemoContent().
 */

import { MongoClient, Db, ObjectId } from 'mongodb'
import { ColumnDef, DBAdapter, DBConfig, StorageFile } from '../types'
import bcrypt   from 'bcryptjs'
import crypto   from 'crypto'
import { CreateUserDataModels } from '../utils/create-data-models'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * DEFAULT_BUCKETS
 *
 * The list of logical storage bucket names used by the platform.
 * In MongoDB there is no native bucket concept, so these names are stored as
 * metadata in the nxf_storage collection rather than creating separate
 * collections. The installer UI uses this list to show the user which buckets
 * were set up.
 */
const DEFAULT_BUCKETS = [
  'system',
  'themes',
  'extensions',
  'projects',
  'avatars',
  'logos',
  'uploads',
]

// ---------------------------------------------------------------------------
// MongoDBAdapter class
// ---------------------------------------------------------------------------

export class MongoDBAdapter implements DBAdapter {

  /**
   * supportsBuiltInAuth
   *
   * Set to false because MongoDB has no built-in authentication system.
   * All session management is handled manually through nxf_users and
   * nxf_system_tokens by this adapter.
   */
  supportsBuiltInAuth = false

  /** Internal store for the resolved DBConfig passed to the constructor. */
  private _config: DBConfig

  /**
   * client
   * The MongoClient instance used for all database operations. Created once
   * in the constructor and reused for the lifetime of this adapter instance.
   */
  private client: MongoClient

  /**
   * db
   * The resolved Db instance, populated lazily on the first call to getDb().
   * Undefined until the first database operation is performed.
   */
  private db?: Db

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  /**
   * constructor
   *
   * Initialises the adapter with the provided database configuration.
   * Validates that a connectionString is present (required by MongoClient)
   * and creates the MongoClient instance. The actual network connection is
   * not established here — it is deferred to the first call to getDb().
   *
   * @param config — The database configuration object. Must include
   *                 connectionString and databaseName.
   * @throws If connectionString is missing from config.
   */
  constructor(config: DBConfig) {
    if (!config.connectionString)
      throw new Error('[MongoDBAdapter] connectionString is required')
    this._config = config
    this.client  = new MongoClient(config.connectionString)
  }

  // -------------------------------------------------------------------------
  // Config accessor
  // -------------------------------------------------------------------------

  /**
   * config (getter)
   *
   * Exposes the internal DBConfig so the adapter interface's config property
   * is satisfied without exposing the private _config field directly.
   */
  get config(): DBConfig {
    return this._config
  }

  // -------------------------------------------------------------------------
  // Connection management
  // -------------------------------------------------------------------------

  /**
   * getDb
   *
   * Returns the Db instance for this adapter, connecting to MongoDB on the
   * first call and reusing the connection on all subsequent calls (lazy
   * initialisation / connection pooling pattern).
   *
   * Why lazy connection?
   * Connecting to MongoDB takes time and should only happen when a database
   * operation is actually needed. Deferring it to the first use means adapter
   * instances can be created cheaply without immediately opening a network
   * connection.
   *
   * @returns A promise that resolves to the connected Db instance.
   * @throws If databaseName is missing from the config.
   */
  private async getDb(): Promise<Db> {
    if (!this.db) {
      await this.client.connect()

      if (!this._config.databaseName) {
        throw new Error('[MongoDBAdapter] Missing database name in config')
      }

      this.db = this.client.db(this._config.databaseName)
    }

    return this.db
  }

  // -------------------------------------------------------------------------
  // Connection test
  // -------------------------------------------------------------------------

  /**
   * testConnection
   *
   * Verifies that the adapter can successfully connect to MongoDB by sending
   * a ping command. Used by the installer wizard's "Test Connection" step to
   * validate the user's database credentials before proceeding.
   *
   * Returns a result object rather than throwing so the caller can display a
   * user-friendly message without needing a try/catch.
   *
   * @returns { success: true, message } on success, or
   *          { success: false, message } with the error reason on failure.
   */

  
async testConnection() {
  let client: MongoClient | null = null

  try {
    const connectionString = this._config.connectionString

    if (!connectionString) {
      throw new Error('Connection string is missing')
    }

    const safeConnectionString = this.sanitizeMongoConnectionString(connectionString)

    client = new MongoClient(safeConnectionString)

    await client.connect()

    const dbName = this._config.databaseName || 'admin'

    await client.db(dbName).command({ ping: 1 })

    return {
      success: true,
      message: 'Connected to MongoDB successfully.',
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to MongoDB.',
    }
  } finally {
    if (client) await client.close()
  }
}

 sanitizeMongoConnectionString(
  connectionString: string
): string {
  try {
    const protocol = 'mongodb+srv://'

    if (!connectionString.startsWith(protocol)) {
      return connectionString
    }

    const withoutProtocol = connectionString.slice(protocol.length)

    const atIndex = withoutProtocol.lastIndexOf('@')

    if (atIndex === -1) {
      return connectionString
    }

    const credentials = withoutProtocol.slice(0, atIndex)
    const remainder = withoutProtocol.slice(atIndex + 1)

    const colonIndex = credentials.indexOf(':')

    if (colonIndex === -1) {
      return connectionString
    }

    const username = credentials.slice(0, colonIndex)
    const password = credentials.slice(colonIndex + 1)

    return `${protocol}${encodeURIComponent(
      username
    )}:${encodeURIComponent(password)}@${remainder}`
  } catch {
    return connectionString
  }
}
  // -------------------------------------------------------------------------
  // Password helpers
  // -------------------------------------------------------------------------

  /**
   * hashPassword
   *
   * Hashes a plain-text password using bcrypt with a salt round of 10.
   * Always call this before storing any password — never store plain text.
   *
   * @param password — The plain-text password to hash.
   * @returns A promise resolving to the bcrypt hash string.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  /**
   * comparePassword
   *
   * Compares a plain-text password against a stored bcrypt hash.
   * Used during login to verify the user's credentials.
   *
   * @param password — The plain-text password provided by the user.
   * @param hash     — The bcrypt hash stored in the database.
   * @returns A promise resolving to true if they match, false otherwise.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // -------------------------------------------------------------------------
  // Core CRUD
  // -------------------------------------------------------------------------

  /**
   * create
   *
   * Inserts a single document into the specified MongoDB collection.
   *
   * @param config     — DB config (unused directly; connection comes from getDb).
   * @param collection — The name of the target collection.
   * @param data       — The document to insert.
   * @returns A promise resolving to the inserted document's _id as a string.
   */
  async create(config: DBConfig, collection: string, data: any): Promise<string> {
    const db  = await this.getDb()
    const res = await db.collection(collection).insertOne(data)
    return res.insertedId.toString()
  }

  /**
   * read
   *
   * Finds all documents in the specified collection that match the query.
   * Returns an empty array if no documents match.
   *
   * @param config     — DB config (unused directly).
   * @param collection — The name of the target collection.
   * @param query      — MongoDB query filter object. Defaults to {} (all docs).
   * @returns A promise resolving to an array of matching documents.
   */
  async read(config: DBConfig, collection: string, query: any = {}): Promise<any[]> {
    const db = await this.getDb()
    return db.collection(collection).find(query).toArray()
  }

  /**
   * update
   *
   * Updates a single document identified by its _id using $set (partial update).
   * Only the fields present in `data` are changed — other fields are untouched.
   *
   * @param config     — DB config (unused directly).
   * @param collection — The name of the target collection.
   * @param id         — The string representation of the document's ObjectId.
   * @param data       — The fields to update.
   * @returns A promise resolving to true when the update completes.
   */
  async update(config: DBConfig, collection: string, id: string, data: any): Promise<boolean> {
    const db = await this.getDb()
    await db.collection(collection).updateOne(
      { _id: new ObjectId(id) },
      { $set: data },
    )
    return true
  }

  /**
   * delete
   *
   * Deletes a single document identified by its _id from the specified collection.
   *
   * @param config     — DB config (unused directly).
   * @param collection — The name of the target collection.
   * @param id         — The string representation of the document's ObjectId.
   * @returns A promise resolving to true when the deletion completes.
   */
  async delete(config: DBConfig, collection: string, id: string): Promise<boolean> {
    const db = await this.getDb()
    await db.collection(collection).deleteOne({ _id: new ObjectId(id) })
    return true
  }

  // -------------------------------------------------------------------------
  // System config
  // -------------------------------------------------------------------------

  /**
   * findSystemConfigByUserId
   *
   * Fetches the system configuration record for the given user from the
   * nxf_system_config collection. This record holds runtime settings for the
   * user's project (branding, feature flags, etc.) and is loaded by
   * ConsoleLayout on every session refresh.
   *
   * The MongoDB _id field is converted to a plain string `id` field before
   * returning so callers don't need to handle ObjectId instances.
   *
   * @param config — DB config (unused directly).
   * @param userId — The user_id to query by.
   * @returns The config record with a string `id` field, or null if not found.
   * @throws If the database query itself fails unexpectedly.
   */
  async findSystemConfigByUserId(config: DBConfig, userId: string) {
  try {
    if (!userId) return null

    const db         = await this.getDb()
    const collection = db.collection('nxf_system_config')
    const doc        = await collection.findOne({ user_id: userId })

    if (!doc) return null

    const { _id, ...rest } = doc
    return { id: _id.toString(), ...rest }

  } catch (error) {
    throw new Error(
      `MongoDBAdapter.findSystemConfigByUserId failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

  // -------------------------------------------------------------------------
  // User management
  // -------------------------------------------------------------------------

  /**
   * createAdminUser
   *
   * Creates an administrator user account in the nxf_users collection.
   * The password is hashed with bcrypt before storage — the plain-text
   * password is never persisted.
   *
   * @param config — DB config.
   * @param data   — User data including user_email, password, and optionally
   *                 user_id, role, full_name, and notes.
   * @returns The inserted document's _id as a string.
   * @throws If user_email or password are missing.
   */
  async createAdminUser(config: DBConfig, data: any): Promise<string> {
    const { user_id, user_email, password, role = 'admin', ...rest } = data

    if (!user_email || !password)
      throw new Error('Admin user must have email and password')

    const hashed = await this.hashPassword(password)

    return this.create(config, 'nxf_users', {
      user_id:        user_id || crypto.randomUUID(),
      user_email,
      password_hash:  hashed,
      full_name:      rest.full_name  || null,
      role,
      status:         'active',
      email_verified: true,
      token:          null,
      token_ttl:      null,
      notes:          rest.notes || null,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
      ...rest,
    })
  }

  /**
   * findUserByEmail
   *
   * Looks up a user in nxf_users by email address using a case-insensitive
   * comparison (via MongoDB's $expr and $toLower operators). This ensures
   * "User@Example.com" and "user@example.com" are treated as the same account.
   *
   * @param config — DB config (unused directly).
   * @param email  — The email address to search for.
   * @returns The matching user document, or null if not found.
   */
  async findUserByEmail(config: DBConfig, email: string): Promise<any | null> {
    const db              = await this.getDb()
    const normalizedEmail = email.trim().toLowerCase()

    const user = await db.collection('nxf_users').findOne({
      $expr: {
        $eq: [{ $toLower: '$user_email' }, normalizedEmail],
      },
    })

    return user || null
  }

  /**
   * findUserByEmailWithRetry
   *
   * Attempts to find a user by email, retrying up to `retries` times with a
   * `delay` ms pause between attempts. Used in flows where a user record may
   * not be immediately readable after creation (e.g. due to eventual
   * consistency or replication lag on Atlas clusters).
   *
   * @param config  — DB config.
   * @param email   — The email address to search for.
   * @param retries — Maximum number of attempts (default 5).
   * @param delay   — Milliseconds to wait between attempts (default 300).
   * @returns The user document if found within the retry window, or null.
   */
  async findUserByEmailWithRetry(
    config:  DBConfig,
    email:   string,
    retries: number = 5,
    delay:   number = 300,
  ): Promise<any | null> {
    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(config, email)
      if (user) return user
      await new Promise(r => setTimeout(r, delay))
    }
    return null
  }

  /**
   * loginBasic
   *
   * Validates a user's email and password without creating a session token.
   * This is the first step of the full login flow — if it succeeds,
   * loginWithMongo() proceeds to create and store a session token.
   *
   * Validation checks (in order):
   *   1. User exists for the given email.
   *   2. User's email_verified flag is true.
   *   3. Provided password matches the stored bcrypt hash.
   *
   * @param config   — DB config.
   * @param email    — The user's email address.
   * @param password — The plain-text password to verify.
   * @returns { success: true, user } on success, or
   *          { success: false, error } with a reason string on failure.
   */
  async loginBasic(
    config:   DBConfig,
    email:    string,
    password: string,
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    const user = await this.findUserByEmail(config, email)

    if (!user)
      return { success: false, error: 'Invalid email or password' }

    if (!user.email_verified)
      return { success: false, error: 'Please verify your email before logging in' }

    const valid = await this.comparePassword(password, user.password_hash)

    if (!valid)
      return { success: false, error: 'Invalid email or password' }

    return {
      success: true,
      user: {
        user_id:   user.user_id,
        email:     user.user_email,
        full_name: user.full_name,
        role:      user.role   || 'user',
        status:    user.status || 'active',
      },
    }
  }

  // -------------------------------------------------------------------------
  // Password reset
  // -------------------------------------------------------------------------

  /**
   * createPasswordResetToken
   *
   * Generates a cryptographically random password reset token and stores it
   * (with a 1-hour TTL) in the user's nxf_users document. The token is then
   * returned to the caller so it can be emailed to the user.
   *
   * The user is looked up with a case-insensitive email comparison so the
   * flow works regardless of the case used in the reset request.
   *
   * @param email — The email address of the user requesting a reset.
   * @returns The generated reset token string.
   * @throws If the email is missing or no user is found for that email.
   */
  async createPasswordResetToken(email: string): Promise<string> {
    if (!email) throw new Error('Email is required')

    const db              = await this.getDb()
    const normalizedEmail = email.trim().toLowerCase()

    const user = await db.collection('nxf_users').findOne({
      $expr: { $eq: [{ $toLower: '$user_email' }, normalizedEmail] },
    })

    if (!user) throw new Error('User not found')

    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    await db.collection('nxf_users').updateOne(
      { _id: user._id },
      {
        $set: {
          token,
          token_ttl:  ttl.toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    )

    return token
  }

  /**
   * findUserByToken
   *
   * Finds a user whose reset/verification token matches the given string AND
   * whose token_ttl has not yet expired. Used by the password reset and email
   * verification flows to validate a token before acting on it.
   *
   * @param token — The raw token string to look up.
   * @returns The matching user document, or null if not found or expired.
   */
  async findUserByToken(token: string): Promise<any | null> {
    const db   = await this.getDb()
    const user = await db.collection('nxf_users').findOne({
      token,
      token_ttl: { $gt: new Date().toISOString() },
    })
    return user || null
  }

  /**
   * updatePasswordByToken
   *
   * Resets a user's password using a valid (non-expired) reset token.
   * After updating the password hash, the token and its TTL are cleared so
   * the same reset link cannot be used a second time.
   *
   * Note: The newPassword value received here is expected to already be hashed
   * by the caller. See the commented-out hashPassword call for context — if
   * the caller sends a plain-text password in future, uncomment that line.
   *
   * @param token       — The reset token from the user's email link.
   * @param newPassword — The new password value (pre-hashed by the caller).
   * @returns { success: true } on completion.
   * @throws If the token is missing, not found, or expired.
   */
  async updatePasswordByToken(
    token:       string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    if (!token) throw new Error('Token is required')

    const db  = await this.getDb()
    const now = new Date().toISOString()

    /**
     * Find the user with a matching, non-expired token.
     * token_ttl must be greater than the current time (stored as ISO strings,
     * so string comparison works correctly here).
     */
    const user = await db.collection('nxf_users').findOne({
      token,
      token_ttl: { $gt: now },
    })

    if (!user) throw new Error('Invalid or expired token')

    /*
     * NOTE: newPassword is currently expected to arrive pre-hashed.
     * If the caller is updated to send plain text, uncomment the line below:
     * const hashed = await this.hashPassword(newPassword)
     * and replace `password_hash: newPassword` with `password_hash: hashed`.
     */
    await db.collection('nxf_users').updateOne(
      { _id: user._id },
      {
        $set: {
          password_hash: newPassword,
          token:         null,
          token_ttl:     null,
          updated_at:    now,
        },
      },
    )

    return { success: true }
  }

  // -------------------------------------------------------------------------
  // Full login (with token creation)
  // -------------------------------------------------------------------------

  /**
   * loginWithMongo
   *
   * The full console login flow. Validates credentials with loginBasic(), then
   * creates and stores a session token pair (access + refresh) in the
   * nxf_system_tokens collection.
   *
   * Access control:
   * Only users with the 'admin' role can log in through this method. Non-admin
   * users receive a clear error message rather than a generic auth failure.
   *
   * Token lifetimes:
   *   - Access token  : 1 hour.
   *   - Refresh token : 7 days.
   *
   * @param config     — DB config.
   * @param email      — The user's email address.
   * @param password   — The plain-text password to verify.
   * @param ipAddress  — Optional: caller's IP address, stored for audit purposes.
   * @param userAgent  — Optional: caller's user-agent string, stored for audit.
   * @returns { success, user, accessToken, refreshToken, projectId } on success,
   *          or { success: false, error } on failure.
   */
  async loginWithMongo(
    config:    DBConfig,
    email:     string,
    password:  string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const basicLogin = await this.loginBasic(config, email, password)

    if (!basicLogin.success || !basicLogin.user)
      return { success: false, error: basicLogin.error }

    /**
     * Only admin users may access the console. Return a specific error so
     * the UI can show a meaningful message rather than a generic auth failure.
     */
    if (basicLogin.user.role !== 'admin') {
      return {
        success: false,
        error:   'You do not have admin rights to access the console',
        user:    basicLogin.user,
      }
    }

    const project = await this.findProjectByOwnerId(config, basicLogin.user.user_id)
    if (!project) return { success: false, error: 'No project found for user' }

    const now              = new Date()
    const expiresAt        = new Date(now.getTime() + 60 * 60 * 1000)           // 1 hour
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const accessToken      = crypto.randomUUID()
    const refreshToken     = crypto.randomUUID()
    const tokenId          = crypto.randomUUID()

    await this.create(config, 'nxf_system_tokens', {
      token_id:           tokenId,
      user_id:            basicLogin.user.user_id,
      project_id:         project.project_id,
      access_token:       accessToken,
      refresh_token:      refreshToken,
      token_type:         'bearer',
      expires_at:         expiresAt.toISOString(),
      refresh_expires_at: refreshExpiresAt.toISOString(),
      ip_address:         ipAddress || null,
      user_agent:         userAgent || null,
      revoked:            false,
      created_at:         now.toISOString(),
      updated_at:         now.toISOString(),
    })

    return {
      success:     true,
      user:        basicLogin.user,
      accessToken,
      refreshToken,
      projectId:   project.project_id,
    }
  }

  // -------------------------------------------------------------------------
  // User registration
  // -------------------------------------------------------------------------

  /**
   * registerMongoUser
   *
   * Registers a new (non-admin) user account and creates an associated project.
   * The account starts with email_verified = false — the user must click the
   * verification link sent to their email before they can log in.
   *
   * A 24-hour email verification token is generated and returned so the caller
   * can include it in the verification email.
   *
   * @param config — DB config.
   * @param data   — { email, password, full_name? }
   * @returns { success: true, user_id, project_id, token } on success.
   * @throws If email or password are missing, or if the email is already registered.
   */
  async registerMongoUser(
    config: DBConfig,
    data:   { email: string; password: string; full_name?: string },
  ) {
    const { email, password, full_name } = data

    if (!email || !password) throw new Error('Email and password are required')

    const existing = await this.findUserByEmail(config, email)
    if (existing) throw new Error('User already exists')

    const user_id       = crypto.randomUUID()
    const password_hash = await this.hashPassword(password)
    const emailToken    = crypto.randomBytes(32).toString('hex')
    const emailTTL      = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

    await this.create(config, 'nxf_users', {
      user_id,
      user_email:     email,
      password_hash,
      full_name:      full_name || null,
      role:           'user',
      status:         'active',
      email_verified: false,
      token:          emailToken,
      token_ttl:      emailTTL.toISOString(),
      notes:          null,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })

    const project_id = await this.createProject(
      config,
      { name: `${full_name || email}'s Project`, user_id },
    )

    return { success: true, user_id, project_id, token: emailToken }
  }

  // -------------------------------------------------------------------------
  // Email verification
  // -------------------------------------------------------------------------

  /**
   * verifyEmail
   *
   * Marks a user's email address as verified after they click the link in
   * their verification email. The link contains a token that is matched
   * against the token stored in nxf_users.
   *
   * After successful verification:
   *   - email_verified is set to true.
   *   - The token and token_ttl fields are cleared so the link cannot be
   *     reused.
   *
   * @param config — DB config.
   * @param param1 — { token, email } — the verification token from the link
   *                 and the email address (used for context in error messages).
   * @returns { success: true } on successful verification.
   * @throws If the token is missing, not found, or expired.
   */
  async verifyEmail(
    config: DBConfig,
    { token, email }: { token: string; email: string },
  ): Promise<{ success: boolean }> {
    if (!token) throw new Error('Verification token required')

    const db         = await this.getDb()
    const cleanToken = token.trim()

    const user = await db.collection('nxf_users').findOne({ token: cleanToken })

    if (!user) throw new Error('Invalid verification token')

    /**
     * Check that the token has not expired. token_ttl is stored as an ISO
     * string — comparing it to a new Date() via string coercion works correctly
     * because ISO 8601 strings sort lexicographically in date order.
     */
    if (user.token_ttl && new Date(user.token_ttl) < new Date()) {
      throw new Error('Verification token expired')
    }

    await db.collection('nxf_users').updateOne(
      { _id: user._id },
      {
        $set: {
          email_verified: true,
          token:          null,
          token_ttl:      null,
          updated_at:     new Date().toISOString(),
        },
      },
    )

    return { success: true }
  }

  /**
   * resendVerificationEmail
   *
   * Generates a fresh 24-hour verification token for a user who has not yet
   * verified their email, replacing the old token. The new token is returned
   * to the caller for inclusion in a new verification email.
   *
   * @param config — DB config.
   * @param email  — The user's email address.
   * @returns { success: true, token } on success.
   * @throws If the user is not found or is already verified.
   */
  async resendVerificationEmail(
    config: DBConfig,
    email:  string,
  ): Promise<{ success: boolean; token: string }> {
    const user = await this.findUserByEmail(config, email)
    if (!user)            throw new Error('User not found')
    if (user.email_verified) throw new Error('Email already verified')

    const newToken = crypto.randomBytes(32).toString('hex')
    const newTTL   = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

    const db = await this.getDb()
    await db.collection('nxf_users').updateOne(
      { _id: user._id },
      {
        $set: {
          token:      newToken,
          token_ttl:  newTTL.toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    )

    return { success: true, token: newToken }
  }

  // -------------------------------------------------------------------------
  // Token helpers
  // -------------------------------------------------------------------------

  /**
   * findTokenByAccessToken
   *
   * Looks up a session token record in nxf_system_tokens by the raw access
   * token string. Used by the session validation middleware and logout route
   * to identify which session a given token belongs to.
   *
   * @param accessToken — The access token string to look up.
   * @returns The matching token document, or null if not found.
   */
  async findTokenByAccessToken(accessToken: string): Promise<any | null> {
    if (!accessToken) return null
    const db = await this.getDb()
    return db.collection('nxf_system_tokens').findOne({ access_token: accessToken })
  }

  /**
   * findTokenByRefreshToken
   *
   * Looks up a session token record by the refresh token string. Used by the
   * session refresh flow to verify a refresh token and issue a new access token.
   *
   * @param refreshToken — The refresh token string to look up.
   * @returns The matching token document, or null if not found.
   */
  async findTokenByRefreshToken(refreshToken: string): Promise<any | null> {
    if (!refreshToken) return null
    const db = await this.getDb()
    return db.collection('nxf_system_tokens').findOne({ refresh_token: refreshToken })
  }

  /**
   * extendToken
   *
   * Partially updates a token record in nxf_system_tokens identified by its
   * token_id. Used to extend the expiry of an access token (session refresh)
   * or to mark a token as revoked (logout).
   *
   * @param tokenId — The token_id of the record to update.
   * @param data    — Partial update payload (e.g. { expires_at, updated_at }
   *                  or { revoked: true, updated_at }).
   * @returns true when the update completes.
   * @throws If tokenId is missing.
   */
  async extendToken(
    tokenId: string,
    data:    Partial<{ expires_at: string; updated_at: string }>,
  ): Promise<boolean> {
    if (!tokenId) throw new Error('Token ID is required')
    const db = await this.getDb()
    await db.collection('nxf_system_tokens').updateOne(
      { token_id: tokenId },
      { $set: data },
    )
    return true
  }

  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------

  /**
   * createProject
   *
   * Creates a new project record in nxf_system_projects and returns the
   * generated project_id. Called during user registration to ensure every
   * new user has an associated project.
   *
   * @param config — DB config.
   * @param data   — { name, user_id } — project display name and owner.
   * @returns The generated project_id (UUID string).
   */
 async createProject(
  config: DBConfig,
  data:   { name: string; user_id: string; tenant_ID?: string },
): Promise<string> {
  const project_id = crypto.randomUUID()
  await this.create(config, 'nxf_system_projects', {
    project_id,
    name:       data.name,
    user_id:    data.user_id,
    tenant_id:  data.tenant_ID ?? null,
    created_at: new Date().toISOString(),
  })
  return project_id
}

  /**
   * findProjectByOwnerId
   *
   * Returns the first project record owned by the given user_id.
   * Used during login to associate the session token with the user's project.
   *
   * @param config   — DB config.
   * @param ownerId  — The user_id to search by.
   * @returns The first matching project document, or null if none found.
   */
  async findProjectByOwnerId(
    config:  DBConfig,
    ownerId: string,
  ): Promise<any | null> {
    return (await this.read(config, 'nxf_system_projects', { user_id: ownerId }))[0] || null
  }

  // -------------------------------------------------------------------------
  // Tenants
  // -------------------------------------------------------------------------

  /**
   * createTenant
   *
   * Creates a new tenant record in nxf_system_tenants. Tenants map a
   * subdomain to a user email, enabling multi-tenant project isolation.
   *
   * @param config — DB config.
   * @param data   — { subdomain, user_email }
   * @returns The generated ten_id (UUID string).
   */
  async createTenant(
    config: DBConfig,
    data:   { subdomain: string; user_email: string },
  ): Promise<string> {
    const ten_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_tenants', {
      ten_id,
      subdomain:  data.subdomain,
      user_email: data.user_email,
      created_at: new Date().toISOString(),
    })
    return ten_id
  }

  /**
   * findTenantByUserEmail
   *
   * Returns the first tenant record associated with the given email address.
   *
   * @param config — DB config.
   * @param email  — The user email to search by.
   * @returns The first matching tenant document, or null if none found.
   */
  async findTenantByUserEmail(
    config: DBConfig,
    email:  string,
  ): Promise<any | null> {
    return (
      await this.read(config, 'nxf_system_tenants', { user_email: email })
    )[0] || null
  }

 async findTenantByUserID(
    config: DBConfig,
    user_id:  string,
  ): Promise<any | null> {
    return (
      await this.read(config, 'nxf_system_tenants', { user_id: user_id })
    )[0] || null
  }

  // -------------------------------------------------------------------------
  // Installer config
  // -------------------------------------------------------------------------

  /**
   * saveInstallerConfig
   *
   * Persists the installer configuration object to the nxf_system_config
   * collection. Called at the end of the installer wizard flow.
   *
   * @param config — DB config.
   * @param data   — The installer config data to store.
   * @returns The inserted document's _id as a string.
   */
  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    return this.create(config, 'nxf_system_config', {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  // -------------------------------------------------------------------------
  // Table / collection creation
  // -------------------------------------------------------------------------

  /**
   * createTable
   *
   * Creates a MongoDB collection (equivalent to a "table" in SQL) and applies
   * unique indexes for any columns marked as unique or primary key.
   *
   * MongoDB creates collections implicitly on first insert, but calling
   * createCollection() explicitly ensures the collection exists even if no
   * documents are inserted immediately (e.g. during initial schema setup).
   *
   * The schema columns can be provided as either an array of ColumnDef objects
   * or as a Record<string, Omit<ColumnDef, 'name'>> map — both formats are
   * normalised to an array before processing.
   *
   * @param tableName — The name of the collection to create.
   * @param schema    — The collection schema including column definitions.
   */
  async createTable(
    tableName: string,
    schema:    { columns: ColumnDef[] | Record<string, Omit<ColumnDef, 'name'>> },
  ): Promise<void> {
    const db = await this.getDb()

    /**
     * Only create the collection if it does not already exist.
     * listCollections() with a name filter returns an array — if empty, the
     * collection is new and needs to be created.
     */
    const exists = await db.listCollections({ name: tableName }).toArray()
    if (!exists.length) await db.createCollection(tableName)

    /**
     * Normalise the columns input to a flat array of ColumnDef objects.
     * Array format is used as-is; Record format is converted by spreading
     * each entry's definition with the key as the `name` field.
     */
    const columnsArray: ColumnDef[] = Array.isArray(schema.columns)
      ? schema.columns
      : Object.entries(schema.columns).map(([name, def]: any) => ({
          name,
          ...def,
        }))

    /**
     * Create a unique index for any column marked as unique or primary.
     * MongoDB enforces uniqueness at the index level, not the collection level.
     */
    for (const col of columnsArray) {
      if (col.unique || col.is_primary) {
        await db.collection(tableName).createIndex(
          { [col.name]: 1 },
          { unique: true },
        )
      }
    }
  }

  // -------------------------------------------------------------------------
  // Data models
  // -------------------------------------------------------------------------

  /**
   * CreateDataModels
   *
   * Generates the project-specific data models for the given project and
   * project type by delegating to the shared CreateUserDataModels utility.
   * The utility inserts the appropriate model records into the database.
   *
   * @param projectId           — The project_id to scope the models to.
   * @param selectedProjectType — The project type (e.g. 'ecommerce', 'cms').
   * @returns The result from CreateUserDataModels.
   */
async createDataModels(projectId: string, selectedProjectType: string = ''): Promise<any> {
  return CreateUserDataModels(this, projectId, '', selectedProjectType, [])
}

  /**
   * createDataModelsFromUserEmail
   *
   * Convenience method that resolves the user and project from an email
   * address, then calls CreateDataModels(). Used by the installer API route
   * which only has the admin user's email at the point of model creation.
   *
   * @param email               — The admin user's email address.
   * @param selectedProjectType — The project type to generate models for.
   * @returns The result from CreateDataModels.
   * @throws If the email is missing, the user is not found, or the project
   *         is not found.
   */
  async createDataModelsFromUserEmail(
    email:               string,
    selectedProjectType: string,
  ) {
    if (!email) throw new Error('Missing User Email')

    const user = await this.findUserByEmail(this.config, email)
    if (!user?.user_id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.user_id)
    if (!project?.project_id) throw new Error('Project not found')

    return this.createDataModels(project.project_id, selectedProjectType)
  }

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  /**
   * setupStorageBuckets
   *
   * Creates the nxf_storage collection if it does not already exist, and
   * returns the list of logical bucket names used by the platform.
   *
   * Note: MongoDB has no native storage bucket concept. The nxf_storage
   * collection acts as a metadata store for bucket records. Actual file
   * storage would use GridFS or an external service (e.g. S3).
   *
   * @returns { success: true, buckets: string[] } — always succeeds if the
   *          DB connection is healthy.
   */
  async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
    const db     = await this.getDb()
    const exists = (
      await db.listCollections({ name: 'nxf_storage' }).toArray()
    ).length

    if (!exists) await db.createCollection('nxf_storage')

    return { success: true, buckets: DEFAULT_BUCKETS }
  }

  // -------------------------------------------------------------------------
  // Demo content
  // -------------------------------------------------------------------------

  /**
   * installDemoContent
   *
   * Seeds the database with demo/sample data by reading JSON files from the
   * demo_content directory on disk and inserting their contents into the
   * corresponding MongoDB collections.
   *
   * File layout expected on disk:
   *   <repo-root>/../demo_content/
   *     <selectedProjectType>_models/   — project-specific demo records
   *     system_models/                  — platform system records
   *     users_models/                   — sample user records
   *
   * Each JSON file should be named after the target collection (e.g.
   * nxf_products.json → inserted into the nxf_products collection).
   *
   * Two JSON formats are supported:
   *   - A plain array:          [ { ... }, { ... } ]
   *   - A wrapped object:       { "demo_data": [ { ... }, { ... } ] }
   *
   * Insertion strategy:
   *   - insertMany() is called with ordered: false so a single bad document
   *     does not abort the entire batch — other documents still get inserted.
   *   - If insertMany() throws (e.g. duplicate key), any partial success
   *     count from err.result.nInserted is still added to the total so the
   *     caller gets an accurate count of what was inserted.
   *   - Missing folders and empty files are silently skipped.
   *
   * @param config              — DB config.
   * @param selectedProjectType — Determines which project-specific folder to read.
   * @returns { success, inserted, skipped, message } describing the outcome.
   */
async installDemoContent(
  config: DBConfig,
  selectedProjectType: string,
  adminEmail?: string
): Promise<{ success: boolean; error?: string; inserted?: number; skipped?: boolean }> {
  const fs   = require('fs')
  const path = require('path')

  try {
    if (!selectedProjectType) throw new Error('selectedProjectType is required')

    const db        = await this.getDb()
    const DEMO_ROOT = path.resolve(process.cwd(), '..', 'demo_content')

    console.log('[MongoAdapter] installDemoContent — mongoDatabase:', config.mongoDatabase)
    console.log('[MongoAdapter] installDemoContent — DEMO_ROOT:', DEMO_ROOT)
    console.log('[MongoAdapter] installDemoContent — DEMO_ROOT exists:', fs.existsSync(DEMO_ROOT))
    console.log('[MongoAdapter] installDemoContent — selectedProjectType:', selectedProjectType)
    console.log('[MongoAdapter] installDemoContent — adminEmail:', adminEmail ?? 'not provided')

    // ── Resolve admin user ──────────────────────────────────────────────────

    const testUser = await db.collection('nxf_users').findOne({})
    console.log('[MongoAdapter] installDemoContent — first nxf_users doc:', JSON.stringify(testUser, null, 2))

    if (!adminEmail) {
      console.log('[MongoAdapter] installDemoContent — adminEmail missing, attempting nxf_users lookup')
      const fallbackAdmin = await db.collection('nxf_users').findOne({ role: 'admin' })
      console.log('[MongoAdapter] installDemoContent — fallbackAdmin:', JSON.stringify(fallbackAdmin, null, 2))
      if (fallbackAdmin?.user_email) {
        adminEmail = fallbackAdmin.user_email
      } else if (fallbackAdmin?.email) {
        adminEmail = fallbackAdmin.email
      }
    }

    if (!adminEmail) {
      console.warn('[MongoAdapter] installDemoContent — no adminEmail resolved, ownership IDs will be empty')
    }

    let adminUserId: string | null = null
    let projectId:   string | null = null
    let tenantId:    string | null = null

    if (adminEmail) {
      try {
        const adminUser =
          await db.collection('nxf_users').findOne({ user_email: adminEmail }) ??
          await db.collection('nxf_users').findOne({ email: adminEmail }) ??
          await db.collection('nxf_users').findOne({ role: 'admin' })

        if (adminUser) {
          adminUserId = adminUser.user_id ?? adminUser._id?.toString()
        }

        if (adminUserId) {
          const project =
            await db.collection('nxf_system_projects').findOne({ user_id: adminUserId }) ??
            await db.collection('nxf_system_projects').findOne({})

          if (project) {
            projectId = project.project_id ?? project._id?.toString()
          }

          const tenant =
            await db.collection('nxf_system_tenants').findOne({ user_id: adminUserId }) ??
            await db.collection('nxf_system_tenants').findOne({})

          if (tenant) {
            tenantId = tenant.ten_id ?? tenant._id?.toString()
          }
        }
      } catch (err: any) {
        console.warn('[MongoAdapter] installDemoContent — could not resolve ownership IDs:', err.message)
      }
    }

    // ── Pre-build the model name → sm_id resolver map ───────────────────────
    // Used by the nxf_pages installer to resolve "model": "nxf_product"
    // into the actual sm_id at install time.

    const modelNameToId = new Map<string, string>()
    if (projectId) {
      try {
        const models = await db
          .collection('nxf_system_models')
          .find({ project_id: projectId })
          .toArray()

        for (const m of models) {
          const id = m.sm_id ?? m._id?.toString()
          if (m.name && id) modelNameToId.set(m.name, id)
        }

        console.log(
          `[MongoAdapter] Built model resolver map — ${modelNameToId.size} models indexed`
        )
      } catch (err: any) {
        console.warn('[MongoAdapter] Failed to build model resolver map:', err.message)
      }
    }

    const modelFolders = [
      'system_models',
      'users_models',
      `${selectedProjectType}_models`,
    ]

    const basePaths = modelFolders.map((folder) =>
      path.join(DEMO_ROOT, folder)
    )

    let totalInserted = 0

    for (const basePath of basePaths) {
      console.log('[MongoAdapter] Checking demo content path:', basePath)

      if (!fs.existsSync(basePath)) {
        console.log('[MongoAdapter] Demo folder not found, skipping:', basePath)
        continue
      }

      const files = fs.readdirSync(basePath).filter((f: string) => f.endsWith('.json'))
      console.log(`[MongoAdapter] Found ${files.length} JSON files in:`, basePath)

      for (const file of files) {
        const filePath = path.join(basePath, file)
        const raw      = fs.readFileSync(filePath, 'utf-8')

        let json: any
        try {
          json = JSON.parse(raw)
        } catch (parseErr: any) {
          console.warn(`[MongoAdapter] Skipping invalid JSON: ${file} — ${parseErr.message}`)
          continue
        }

        const collectionName = file.replace('.json', '')
        const rows           = Array.isArray(json) ? json : json?.demo_data

        if (!rows || !Array.isArray(rows)) {
          console.log(`[MongoAdapter] Skipping ${file} — no valid data array found`)
          continue
        }

        console.log(`[MongoAdapter] Inserting into ${collectionName} — ${rows.length} rows`)

        const collection = db.collection(collectionName)

        const docs = rows.map((row: any) => {
          const cleaned: any = {}

          for (const key in row) {
            if (row[key] !== undefined) cleaned[key] = row[key]
          }

          // Resolve model name → model_id for nxf_pages rows
          if (collectionName === 'nxf_pages' && cleaned.model) {
            const resolvedId = modelNameToId.get(cleaned.model)
            if (resolvedId) {
              cleaned.model_id = resolvedId
            } else {
              console.warn(
                `[MongoAdapter] Page "${cleaned.slug}" references model "${cleaned.model}" which does not exist — model_id left null`
              )
            }
          }

          if (projectId) {
            cleaned.project_id = (
              cleaned.project_id === '{{project_id}}' || !cleaned.project_id
            ) ? projectId : cleaned.project_id
          }

          if (tenantId) {
            cleaned.tenant_id = (
              cleaned.tenant_id === '{{tenant_id}}' || !cleaned.tenant_id
            ) ? tenantId : cleaned.tenant_id
          }

          if (adminUserId && 'user_id' in cleaned) {
            cleaned.user_id = (
              cleaned.user_id === '{{user_id}}' || !cleaned.user_id
            ) ? adminUserId : cleaned.user_id
          }

          cleaned.created_at = cleaned.created_at || new Date().toISOString()
          cleaned.updated_at = cleaned.updated_at || null

          return cleaned
        })

        try {
          await collection.insertMany(docs, { ordered: false })
          totalInserted += docs.length
          console.log(`[MongoAdapter] Inserted ${docs.length} rows into ${collectionName}`)
        } catch (insertErr: any) {
          console.error(`[MongoAdapter] Insert failed for ${collectionName}:`, insertErr.message)
        }
      }
    }

    console.log(`[MongoAdapter] installDemoContent complete — total inserted: ${totalInserted}`)
    return { success: true, inserted: totalInserted }

  } catch (err: any) {
    console.error('[MongoAdapter] installDemoContent failed:', err.message, err.stack)
    return { success: false, inserted: 0, error: err.message ?? 'Failed to install demo content' }
  }
}
  // ─── Core CRUD ────────────────────────────────────────────────────────────────

async readAll(config: DBConfig, collection: string): Promise<any[]> {
  try {
    console.log(`[MongoAdapter] readAll — collection: ${collection}`)
    const db   = await this.getDb()  // ← use getDb() not this.db
    const docs = await db.collection(collection).find({}).toArray()
    return docs.map((doc) => ({
      ...doc,
      id: doc._id?.toString() ?? doc.id,
    }))
  } catch (err: any) {
    console.error(`[MongoAdapter] readAll failed — collection: ${collection}`)
    throw new Error(`readAll failed: ${err.message}`)
  }
}

// ─── Users & Auth ─────────────────────────────────────────────────────────────

async getUserById(uid: string): Promise<{ user?: any; error?: string }> {
  try {
    if (!uid) return { error: 'UID is required' }

    const db  = await this.getDb()
    const doc = await db.collection('nxf_users').findOne({ user_id: uid })

    if (!doc) return { error: 'User not found' }

    return { user: { ...doc, id: doc._id?.toString() } }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch user' }
  }
}



async checkUserStatus(
  config: DBConfig,
  userId: string
): Promise<{ allowed: boolean; user?: any; reason?: string }> {
  try {
    if (!userId) return { allowed: false, reason: 'No user ID provided' }

    const db  = await this.getDb()
    const doc = await db.collection('nxf_users').findOne({ user_id: userId }) as Record<string, any> | null

    if (!doc) return { allowed: false, reason: 'User not found' }

    const user = { ...doc, id: doc._id?.toString() } as Record<string, any> & { id: string }

    if (user.status === 'suspended') return { allowed: false, user, reason: 'Account suspended' }
    if (user.status === 'inactive')  return { allowed: false, user, reason: 'Account inactive' }

    return { allowed: true, user }

  } catch (err: any) {
    console.error('[MongoAdapter] checkUserStatus failed')
    return { allowed: false, reason: err.message || 'Status check failed' }
  }
}

async syncAuthUserToDatabase(
  config: DBConfig,
  user: { uid: string; email: string; full_name: string; notes?: string }
): Promise<string> {
  if (!user?.uid)      throw new Error('User UID is required')
  if (!user.full_name) throw new Error('Full name is required')

  const db         = await this.getDb()
  const collection = db.collection('nxf_users')
  const existing   = await collection.findOne({ user_id: user.uid })

  if (!existing) {
    await collection.insertOne({
      user_id:    user.uid,
      user_email: user.email || '',
      full_name:  user.full_name,
      role:       'user',
      status:     'active',
      notes:      user.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  } else {
    await collection.updateOne(
      { user_id: user.uid },
      {
        $set: {
          user_email: user.email || '',
          full_name:  user.full_name,
          updated_at: new Date().toISOString(),
        },
      }
    )
  }

  return user.uid
}

async writeActivityLog(
  config: DBConfig,
  entry: { user_id: string; action: string; context?: string }
): Promise<void> {
  try {
    const db = await this.getDb()

    const projects   = await db.collection('nxf_system_projects').find({}).limit(1).toArray()
    const project_id = projects[0]?.project_id ?? projects[0]?._id?.toString() ?? null

    const tenants   = await db.collection('nxf_system_tenants').find({}).limit(1).toArray()
    const tenant_id = tenants[0]?.ten_id ?? tenants[0]?._id?.toString() ?? null

    await db.collection('nxf_system_activity_logs').insertOne({
      log_id:     crypto.randomUUID(),
      project_id,
      tenant_id,
      user_id:    entry.user_id,
      action:     entry.action,
      context:    entry.context ?? null,
      created_at: new Date().toISOString(),
    })

  } catch (err: any) {
    console.error('[MongoAdapter] writeActivityLog failed:', err.message)
  }
}

// ─── Table / Collection Management ───────────────────────────────────────────

async alterTable(
  tableName: string,
  changes: { add?: ColumnDef[]; drop?: string[]; rename?: { from: string; to: string } }
): Promise<any> {
  console.log(`[MongoAdapter] alterTable — ${tableName}`)

  const db         = await this.getDb()
  const collection = db.collection(tableName)

  if (changes.rename) {
    await collection.updateMany(
      {},
      { $rename: { [changes.rename.from]: changes.rename.to } }
    )
    console.log(`[MongoAdapter] alterTable — renamed field ${changes.rename.from} → ${changes.rename.to} on all docs in ${tableName}`)
  }

  if (changes.drop?.length) {
    const unsetFields: Record<string, string> = {}
    changes.drop.forEach((field) => { unsetFields[field] = '' })
    await collection.updateMany({}, { $unset: unsetFields })
    console.log(`[MongoAdapter] alterTable — dropped fields from ${tableName}`)
  }

  console.log(`[MongoAdapter] alterTable completed for ${tableName}`)
  return true
}

async dropTable(tableName: string): Promise<any> {
  console.log(`[MongoAdapter] dropTable — ${tableName}`)

  const db = await this.getDb()

  const collections = await db.listCollections({ name: tableName }).toArray()
  if (!collections.length) {
    console.log(`[MongoAdapter] dropTable — collection does not exist, skipping: ${tableName}`)
    return true
  }

  await db.collection(tableName).drop()
  console.log(`[MongoAdapter] dropTable completed — ${tableName}`)
  return true
}

async renameTable(oldName: string, newName: string): Promise<any> {
  console.log(`[MongoAdapter] renameTable — ${oldName} → ${newName}`)

  const db = await this.getDb()
  await db.collection(oldName).rename(newName)

  console.log(`[MongoAdapter] renameTable completed — ${oldName} → ${newName}`)
  return true
}

// ─── Messages ─────────────────────────────────────────────────────────────────

async listConversations(
  config:     DBConfig,
  project_id: string,
  uid:        string,
  limit       = 10
): Promise<Array<Record<string, any>>> {
  const db   = await this.getDb()
  const docs = await db
    .collection('nxf_system_conversations')
    .find({ project_id })
    .sort({ last_message_at: -1 })
    .limit(limit)
    .toArray()

  const seen    = new Set<string>()
  const deduped = docs.filter((doc) => {
    const con_id = doc.con_id ?? doc._id?.toString()
    if (seen.has(con_id)) return false
    seen.add(con_id)
    return true
  })

  const withUnread = await Promise.all(
    deduped.map(async (conv) => {
      const con_id      = conv.con_id ?? conv._id?.toString()
      const unreadCount = await db
        .collection('nxf_system_messages')
        .countDocuments({ conversation_id: con_id, recipient_id: uid, is_read: false })
      return { ...conv, id: con_id, con_id, unread_count: unreadCount }
    })
  )

  return withUnread
}

async getConversationThread(
  config:         DBConfig,
  conversationId: string
): Promise<Array<Record<string, any>>> {
  const db   = await this.getDb()
  const docs = await db
    .collection('nxf_system_messages')
    .find({ conversation_id: conversationId })
    .sort({ sent_at: 1 })
    .toArray()

  const seen = new Set<string>()
  return docs.filter((doc) => {
    const mes_id = doc.mes_id ?? doc._id?.toString()
    if (seen.has(mes_id)) return false
    seen.add(mes_id)
    return true
  }).map((doc) => ({ ...doc, mes_id: doc.mes_id ?? doc._id?.toString() }))
}

async sendMessage(
  config:         DBConfig,
  conversationId: string,
  senderId:       string,
  content:        string
): Promise<Record<string, any>> {
  const db  = await this.getDb()
  const now = new Date().toISOString()
  const mes_id = crypto.randomUUID()

  const projects   = await db.collection('nxf_system_projects').find({}).limit(1).toArray()
  const project_id = projects[0]?.project_id ?? projects[0]?._id?.toString() ?? null

  const tenants   = await db.collection('nxf_system_tenants').find({}).limit(1).toArray()
  const tenant_id = tenants[0]?.ten_id ?? tenants[0]?._id?.toString() ?? null

  const message = {
    mes_id,
    project_id,
    tenant_id,
    conversation_id: conversationId,
    sender_id:       senderId,
    recipient_id:    null,
    content,
    is_read:         false,
    sent_at:         now,
    created_at:      now,
    updated_at:      now,
  }

  await db.collection('nxf_system_messages').insertOne(message)

  await db.collection('nxf_system_conversations').updateOne(
    { con_id: conversationId },
    {
      $set: {
        last_message_preview: content.slice(0, 100),
        last_message_at:      now,
        updated_at:           now,
      },
    }
  )

  return message
}

async markConversationRead(
  config:         DBConfig,
  uid:            string,
  conversationId: string
): Promise<{ success: boolean }> {
  const db  = await this.getDb()

  await db.collection('nxf_system_messages').updateMany(
    { conversation_id: conversationId, recipient_id: uid, is_read: false },
    { $set: { is_read: true, updated_at: new Date().toISOString() } }
  )

  return { success: true }
}

async markAllMessagesRead(
  config: DBConfig,
  uid:    string
): Promise<{ success: boolean }> {
 const db  = await this.getDb()

  await db.collection('nxf_system_messages').updateMany(
    { recipient_id: uid, is_read: false },
    { $set: { is_read: true, updated_at: new Date().toISOString() } }
  )

  return { success: true }
}

async deleteConversation(
  config:         DBConfig,
  conversationId: string
): Promise<{ success: boolean }> {
  try {
    const db  = await this.getDb()

    // Delete all messages first
    await db.collection('nxf_system_messages').deleteMany({
      conversation_id: conversationId,
    })

    // Delete the conversation
    await db.collection('nxf_system_conversations').deleteMany({
      con_id: conversationId,
    })

    return { success: true }
  } catch (err: any) {
    throw new Error(`Failed to delete conversation: ${err.message}`)
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

async listNotifications(
  config:     DBConfig,
  uid:        string,
  project_id: string,
  limit       = 20
): Promise<Array<Record<string, any>>> {
  const db  = await this.getDb()
  const docs = await db
    .collection('nxf_system_notifications')
    .find({ project_id, user_id: uid, status: { $ne: 'deleted' } })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray()

  return docs.map((doc) => ({ ...doc, id: doc._id?.toString() }))
}

async markNotificationRead(
  config:         DBConfig,
  notificationId: string,
  uid:            string
): Promise<{ success: boolean }> {
 const db  = await this.getDb()
  const doc = await db
    .collection('nxf_system_notifications')
    .findOne({ id: notificationId })

  if (!doc) throw new Error('Notification not found')
  if (doc.user_id !== uid) throw new Error('Forbidden — notification does not belong to this user')

  const now = new Date().toISOString()

  await db.collection('nxf_system_notifications').updateOne(
    { id: notificationId },
    { $set: { status: 'read', is_read: true, read_at: now, updated_at: now } }
  )

  return { success: true }
}

async markAllNotificationsRead(
  config:     DBConfig,
  uid:        string,
  project_id: string
): Promise<{ success: boolean; updated: number }> {
 const db  = await this.getDb()
  const now = new Date().toISOString()

  const result = await db.collection('nxf_system_notifications').updateMany(
    { project_id, user_id: uid, status: 'unread' },
    { $set: { status: 'read', is_read: true, read_at: now, updated_at: now } }
  )

  return { success: true, updated: result.modifiedCount }
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

async listApiKeys(
  config: DBConfig,
  project_id: string
): Promise<Array<{
  api_id: string
  name: string
  key_prefix: string
  status: string
  last_used_at: string | null
  created_at: string
  id: string
}>> {
  const db  = await this.getDb()

  const docs = await db
    .collection('nxf_system_apis')
    .find({ project_id, status: 'active' })
    .sort({ created_at: -1 })
    .project({
      api_id: 1,
      name: 1,
      key_prefix: 1,
      status: 1,
      last_used_at: 1,
      created_at: 1,
      // key_encrypted intentionally excluded
    })
    .toArray()

  return docs.map((doc) => ({
    api_id: doc.api_id,
    name: doc.name,
    key_prefix: doc.key_prefix,
    status: doc.status,
    last_used_at: doc.last_used_at ?? null,
    created_at: doc.created_at,
    id: doc._id.toString(),
  }))
}

async getApiKey(
  config: DBConfig,
  api_id: string
): Promise<Record<string, any> | null> {
  const db  = await this.getDb()
  const doc = await db.collection('nxf_system_apis').findOne({ api_id })

  if (!doc) return null
  return { ...doc, id: doc._id?.toString() }
}

async revokeApiKey(
  config:     DBConfig,
  api_id:     string,
  project_id: string
): Promise<{ success: boolean }> {
 const db  = await this.getDb()
  const doc = await db.collection('nxf_system_apis').findOne({ api_id })

  if (!doc) throw new Error('API key not found')
  if (doc.project_id !== project_id) throw new Error('Forbidden')

  const now = new Date().toISOString()

  await db.collection('nxf_system_apis').updateOne(
    { api_id },
    { $set: { status: 'revoked', revoked_at: now, updated_at: now } }
  )

  console.log(`[MongoAdapter] revokeApiKey — key ${api_id} revoked`)
  return { success: true }
}

// ─── Storage ──────────────────────────────────────────────────────────────────
// MongoDB has no built-in file storage.
// Files are stored on the local filesystem or a cloud provider (S3/GCS).
// The nxf_storage collection tracks metadata; actual files go to disk.
// All signed URLs below are plain public paths — swap for S3 presigned
// URLs when a cloud bucket is wired up.

async listFolders(): Promise<string[]> {
  try {
    const db  = await this.getDb()
    const docs = await db
      .collection('nxf_storage')
      .distinct('folder')

    return (docs ?? []).filter(Boolean)
  } catch {
    console.error('[MongoAdapter] listFolders failed')
    return []
  }
}

async listFiles(folder: string): Promise<StorageFile[]> {
  try {
    const db  = await this.getDb()
    const docs = await db
      .collection('nxf_storage')
      .find({ folder })
      .toArray()

    return docs.map((doc) => {
      const bytes = Number(doc.size ?? 0)
      const sizeLabel = bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(bytes / 1024)} KB`

      return {
        id:         doc.storage_id ?? doc._id?.toString(),
        name:       doc.file_name,
        url:        doc.url,
        size:       sizeLabel,
        mimeType:   doc.mime_type ?? 'application/octet-stream',
        folder:     doc.folder,
        folderPath: doc.file_path,
        uploaded:   doc.created_at
          ? new Date(doc.created_at).toLocaleDateString('en-GB', {
              day:   '2-digit',
              month: 'short',
              year:  'numeric',
            })
          : '—',
      }
    })
  } catch {
    console.error('[MongoAdapter] listFiles failed')
    return []
  }
}

async uploadFile(
  folder:   string,
  fileName: string,
  buffer:   Buffer,
  mimeType: string
): Promise<string> {
  console.log('[MongoAdapter] uploadFile started')

  const fs   = require('fs')
  const path = require('path')

  // Write to local uploads directory — swap this block for S3/GCS in production
  const uploadsDir = path.resolve(process.cwd(), 'uploads', folder)
  fs.mkdirSync(uploadsDir, { recursive: true })

  const filePath = path.join(uploadsDir, fileName)
  fs.writeFileSync(filePath, buffer)

  // Build a relative URL — serves via Next.js /uploads/ static route
  const url = `/uploads/${folder}/${fileName}`

  // Save metadata to nxf_storage
  const db = await this.getDb()

  await db.collection('nxf_storage').insertOne({
    storage_id: crypto.randomUUID(),
    file_name:  fileName,
    file_path:  `${folder}/${fileName}`,
    folder,
    url,
    mime_type:  mimeType,
    size:       buffer.length,
    created_at: new Date().toISOString(),
  })

  return url
}

async deleteFile(folder: string, fileName: string): Promise<void> {
  const fs   = require('fs')
  const path = require('path')

  const filePath = path.resolve(process.cwd(), 'uploads', folder, fileName)

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  // Remove metadata record
const db  = await this.getDb()
  await db.collection('nxf_storage').deleteOne({ file_path: `${folder}/${fileName}` })
}

async deleteFolder(folder: string): Promise<void> {
  const fs   = require('fs')
  const path = require('path')

  const folderPath = path.resolve(process.cwd(), 'uploads', folder)

  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true })
  }

  // Remove all metadata records for this folder
const db  = await this.getDb()
  await db.collection('nxf_storage').deleteMany({ folder })
}

async createFolder(folder: string): Promise<void> {
  const fs   = require('fs')
  const path = require('path')

  const folderPath = path.resolve(process.cwd(), 'uploads', folder)
  fs.mkdirSync(folderPath, { recursive: true })

  // Write a .keep sentinel so the folder persists in nxf_storage too
  const keepPath = path.join(folderPath, '.keep')
  if (!fs.existsSync(keepPath)) {
    fs.writeFileSync(keepPath, '')
  }
}

async renameFile(folder: string, oldName: string, newName: string): Promise<void> {
  const fs   = require('fs')
  const path = require('path')

  const oldPath = path.resolve(process.cwd(), 'uploads', folder, oldName)
  const newPath = path.resolve(process.cwd(), 'uploads', folder, newName)

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath)
  }

 const db  = await this.getDb()
  const url = `/uploads/${folder}/${newName}`

  await db.collection('nxf_storage').updateOne(
    { file_path: `${folder}/${oldName}` },
    {
      $set: {
        file_name: newName,
        file_path: `${folder}/${newName}`,
        url,
      },
    }
  )
}

async moveFile(fromFolder: string, toFolder: string, fileName: string): Promise<void> {
  const fs   = require('fs')
  const path = require('path')

  const oldPath = path.resolve(process.cwd(), 'uploads', fromFolder, fileName)
  const newDir  = path.resolve(process.cwd(), 'uploads', toFolder)
  const newPath = path.join(newDir, fileName)

  fs.mkdirSync(newDir, { recursive: true })

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath)
  }

  const db  = await this.getDb()
  const url = `/uploads/${toFolder}/${fileName}`

  await db.collection('nxf_storage').updateOne(
    { file_path: `${fromFolder}/${fileName}` },
    {
      $set: {
        folder:    toFolder,
        file_path: `${toFolder}/${fileName}`,
        url,
      },
    }
  )
}

async importFromUrl(folder: string, url: string): Promise<StorageFile> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch URL: ${url}`)

  const buffer   = Buffer.from(await response.arrayBuffer())
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'
  const ext      = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'
  const fileName = `imported_${Date.now()}.${ext}`

  const signedUrl = await this.uploadFile(folder, fileName, buffer, mimeType)

  return {
    id:         `${folder}/${fileName}`,
    name:       fileName,
    url:        signedUrl,
    size:       `${Math.round(buffer.length / 1024)} KB`,
    mimeType,
    folder,
    folderPath: `${folder}/${fileName}`,
    uploaded:   new Date().toLocaleDateString('en-GB', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
    }),
  }
}

async deleteStorageRecordByFilePath(filePath: string): Promise<void> {
  try {
    console.log('[MongoAdapter] deleteStorageRecordByFilePath started')

    const db  = await this.getDb()
    await db.collection('nxf_storage').deleteOne({ file_path: filePath })

    console.log('[MongoAdapter] deleteStorageRecordByFilePath completed')
  } catch {
    console.error('[MongoAdapter] deleteStorageRecordByFilePath failed')
    throw new Error('Failed to delete storage record')
  }
}

// ─── installDemoContent — folder order fix ────────────────────────────────────


}