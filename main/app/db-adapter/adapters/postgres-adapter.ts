/**
 * PostgresAdapter
 *
 * A concrete implementation of the DBAdapter interface that connects to a
 * PostgreSQL database using the `pg` (node-postgres) library.
 *
 * This adapter is the central hub for all database operations when the project
 * is configured to use PostgreSQL. It handles everything from basic CRUD
 * operations and user authentication to project management, token handling,
 * storage metadata, and demo content installation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Key design decisions:
 *
 * Single shared client:
 *   A single `pg.Client` instance is created in the constructor and reused
 *   for the lifetime of the adapter. The `connect()` method is idempotent —
 *   it guards against opening multiple connections using a `connecting` promise
 *   that is awaited by any concurrent caller.
 *
 * Lazy connection:
 *   The database connection is not opened in the constructor. Instead, every
 *   public method that needs the database calls `await this.connect()` first.
 *   This means the connection is only established when it is actually needed.
 *
 * Two-phase token auth:
 *   For MongoDB/MySQL/PostgreSQL (databases without built-in auth), sessions
 *   are managed via a custom `nxf_system_tokens` table. Access tokens expire
 *   after 1 hour; refresh tokens last 7 days.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Tables this adapter interacts with:
 *
 * nxf_users            — User accounts (email, hashed password, role, etc.)
 * nxf_system_projects  — One project per user (links user to their workspace)
 * nxf_system_tokens    — Custom session tokens (access + refresh)
 * nxf_system_config    — Installer configuration records
 * nxf_system_tenants   — Multi-tenant subdomain records
 * nxf_system_models    — User-defined data model schemas
 * nxf_storage          — File/folder metadata for the media library
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Class structure (method groups):
 *
 * Connection     — connect(), testConnection()
 * Password       — hashPassword(), comparePassword()
 * Basic CRUD     — create(), read(), update(), delete()
 * User helpers   — findUserByEmail(), findUserByToken(), findUserByEmailWithRetry()
 *                  createAdminUser(), verifyEmail(), resendVerificationEmail()
 *                  updatePasswordByToken(), createPasswordResetToken()
 * Login          — loginBasic(), loginWithPostgres()
 * Registration   — registerUser()
 * Token helpers  — findTokenByAccessToken(), findTokenByRefreshToken(), extendToken()
 * Project        — createProject(), findProjectByOwnerId()
 * System config  — findSystemConfigByUserId(), saveInstallerConfig()
 * Tenant         — createTenant(), findTenantByUserEmail()
 * Data models    — CreateDataModels(), createDataModelsFromUserEmail()
 * Table creation — createTable()
 * Storage        — setupStorageBuckets(), createBucket()
 * Demo content   — installDemoContent()
 */

// db-adapter/adapters/postgres-adapter.ts

import { Client, ClientConfig } from 'pg'
import bcrypt                   from 'bcrypt'
import crypto                   from 'crypto'
import { DBAdapter, DBConfig, ColumnDef } from '../types'
import { CreateUserDataModels } from '../utils/create-data-models'

export class PostgresAdapter implements DBAdapter {

  /** The underlying node-postgres client used for all queries. */
  private client: Client

  /**
   * Tracks whether the client has completed its initial connection.
   * Prevents duplicate connect() calls from opening multiple connections.
   */
  private isConnected = false

  /**
   * Stores the in-flight connection promise so that concurrent callers
   * awaiting connect() all resolve from the same underlying operation
   * rather than each starting their own connection attempt.
   */
  private connecting: Promise<void> | null = null

  /** The DBConfig this adapter was initialised with. Stored for reuse by methods. */
  public config: DBConfig

  /**
   * DEFAULT_BUCKETS
   *
   * The list of standard storage "folders" created during initial setup.
   * Each entry maps to a row in nxf_storage with an empty file_name,
   * representing a top-level directory in the media library.
   */
  private readonly DEFAULT_BUCKETS = [
    'system',
    'themes',
    'extensions',
    'projects',
    'avatars',
    'logos',
    'uploads',
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new PostgresAdapter instance.
   *
   * Validates that a DBConfig was provided, stores it for later use, and
   * instantiates the `pg.Client` with the connection parameters extracted
   * from the config. The connection is NOT opened here — see connect().
   *
   * @param config — The database connection configuration object.
   * @throws If no config is provided.
   */
  constructor(config: DBConfig) {
    if (!config) throw new Error('DBConfig must be provided via adapter')
    this.config = config

    const pgConfig: ClientConfig = {
      host:     config.host,
      user:     config.user,
      password: config.password,
      database: config.database,
      port:     config.port ? Number(config.port) : undefined,
    }

    this.client = new Client(pgConfig)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Connection
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * connect
   *
   * Opens the PostgreSQL connection if it is not already open.
   *
   * Uses a "singleton promise" pattern via `this.connecting` to ensure that
   * if multiple methods call connect() concurrently before the connection
   * resolves, they all await the same underlying connect() call rather than
   * each racing to open their own connection.
   *
   * After a successful connection, `isConnected` is set to true so all
   * subsequent calls return immediately without hitting the network.
   */
  private async connect() {
    if (this.isConnected) return

    if (!this.connecting) {
      console.log('[PostgresAdapter] Connecting to PostgreSQL...')
      this.connecting = this.client.connect()
        .then(() => {
          this.isConnected = true
          console.log('[PostgresAdapter] PostgreSQL connected successfully')
        })
        .catch(err => {
          // Reset so the next caller can try again
          this.connecting = null
          throw err
        })
    }

    return this.connecting
  }

  /**
   * testConnection
   *
   * Verifies that the database is reachable by running a trivial query (SELECT 1).
   * Used by the installer wizard to validate the user's database credentials
   * before proceeding.
   *
   * Returns a plain object rather than throwing so the caller can display a
   * user-friendly error message without needing a try/catch.
   *
   * @returns { success: boolean, message: string }
   */
  async testConnection() {
    try {
      await this.connect()
      await this.client.query('SELECT 1')
      return { success: true, message: 'Connected to Postgres successfully.' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect' }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * hashPassword
   *
   * Hashes a plaintext password using bcrypt with a salt round of 10.
   * Salt rounds control how computationally expensive the hash is to compute —
   * 10 is a widely accepted default that balances security and performance.
   *
   * Never store plaintext passwords. Always call this before persisting a
   * password to the database.
   *
   * @param password — The plaintext password string to hash.
   * @returns The bcrypt hash string.
   */
  async hashPassword(password: string) {
    const hashed = await bcrypt.hash(password, 10)
    return hashed
  }

  /**
   * comparePassword
   *
   * Verifies that a plaintext password matches a stored bcrypt hash.
   * Used during login to check the user's submitted password against
   * the hash stored in the nxf_users table.
   *
   * Both values are trimmed before comparison to guard against accidental
   * leading/trailing whitespace (a common source of "wrong password" bugs).
   *
   * @param password — The plaintext password submitted by the user.
   * @param hash     — The bcrypt hash retrieved from the database.
   * @returns True if the password matches the hash, false otherwise.
   */
  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password.trim(), hash.trim())
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Basic CRUD
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * create
   *
   * Inserts a new row into the specified table and returns the inserted record.
   *
   * Data normalisation applied before insert:
   * - undefined values on ID columns are replaced with a new UUID.
   * - Date objects are converted to ISO 8601 strings.
   * - Plain objects and arrays are JSON-stringified (for JSONB columns).
   *
   * Uses parameterised queries ($1, $2, ...) throughout to prevent SQL injection.
   *
   * @param _config — DBConfig (unused here; connection is managed by the class).
   * @param table   — The table name to insert into.
   * @param data    — A plain object whose keys are column names.
   * @returns The inserted row as returned by PostgreSQL's RETURNING * clause.
   */
  async create(_config: DBConfig, table: string, data: Record<string, any>) {
    await this.connect()

    // Normalise each value before building the query
    const cleaned: Record<string, any> = {}
    for (const key in data) {
      let value = data[key]
      if (value === undefined && key.toLowerCase().includes('id'))
        value = crypto.randomUUID()
      if (value instanceof Date)
        cleaned[key] = value.toISOString()
      else if (typeof value === 'object' && value !== null)
        cleaned[key] = JSON.stringify(value)
      else
        cleaned[key] = value
    }

    const keys         = Object.keys(cleaned)
    const values       = Object.values(cleaned)
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(',')
    const sql          = `INSERT INTO "${table}" (${keys.join(',')}) VALUES (${placeholders}) RETURNING *`

    const res = await this.client.query(sql, values)
    return res.rows[0]
  }

  /**
   * read
   *
   * Retrieves rows from the specified table, optionally filtered by a query
   * object and paginated with limit/offset.
   *
   * The `query` object is treated as a set of equality filters:
   *   { status: 'active', role: 'admin' }
   *   → WHERE "status" = $1 AND "role" = $2
   *
   * Special keys — `limit`, `offset`, and `order` — are extracted and applied
   * separately. They are not treated as column filters.
   *
   * Uses parameterised queries to prevent SQL injection.
   *
   * @param _config — DBConfig (unused here).
   * @param table   — The table name to query.
   * @param query   — Optional filter object. Supports limit and offset keys.
   * @returns An array of matching rows (empty array if none found).
   */
  async read(_config: DBConfig, table: string, query?: any) {
    await this.connect()

    let sql           = `SELECT * FROM "${table}"`
    const values: any[] = []

    if (query && Object.keys(query).length) {
      const ignoredKeys = ['limit', 'offset', 'order']
      const where = Object.keys(query)
        .filter(k => !ignoredKeys.includes(k))
        .map((k, i) => {
          values.push(query[k])
          return `"${k}" = $${i + 1}`
        })
        .join(' AND ')

      if (where) sql += ` WHERE ${where}`
    }

    if (query?.limit)  sql += ` LIMIT ${Number(query.limit)}`
    if (query?.offset) sql += ` OFFSET ${Number(query.offset)}`

    const res = await this.client.query(sql, values)
    return res.rows
  }

  /**
   * update
   *
   * Updates specific columns on a single row identified by its ID value.
   *
   * The `idColumn` parameter defaults to 'id' but can be overridden for tables
   * that use a different primary key name (e.g. 'user_id', 'project_id').
   *
   * Date values are automatically converted to ISO strings before the update.
   * Uses parameterised queries to prevent SQL injection.
   *
   * @param _config  — DBConfig (unused here).
   * @param table    — The table name to update.
   * @param id       — The value of the primary key identifying the row.
   * @param data     — An object of column → new value pairs to apply.
   * @param idColumn — The primary key column name (default: 'id').
   * @returns The updated row as returned by PostgreSQL's RETURNING * clause.
   */
  async update(
    _config: DBConfig,
    table:    string,
    id:       string,
    data:     any,
    idColumn: string = 'id'
  ) {
    await this.connect()

    const keys   = Object.keys(data)
    const values = Object.values(data).map(v =>
      v instanceof Date ? v.toISOString() : v
    )
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
    const sql = `UPDATE "${table}" SET ${setClause} WHERE "${idColumn}" = $${keys.length + 1} RETURNING *`

    const res = await this.client.query(sql, [...values, id])
    return res.rows[0]
  }

  /**
   * delete
   *
   * Deletes a single row from the specified table by its `id` column value.
   *
   * Note: This method always uses `id` as the key column. For tables with
   * a differently named primary key, use a raw client query instead.
   *
   * @param _config — DBConfig (unused here).
   * @param table   — The table name to delete from.
   * @param id      — The value of the `id` column identifying the row to delete.
   * @returns The deleted row, or undefined if no row matched.
   */
  async delete(_config: DBConfig, table: string, id: string) {
    await this.connect()
    const res = await this.client.query(
      `DELETE FROM "${table}" WHERE id=$1 RETURNING *`,
      [id]
    )
    return res.rows[0]
  }

  // ─────────────────────────────────────────────────────────────────────────
  // System Config
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * findSystemConfigByUserId
   *
   * Retrieves the installer configuration record for a specific user from
   * the nxf_system_config table.
   *
   * Returns null (rather than throwing) when no record is found, so callers
   * can check for null without wrapping in try/catch. Only the first matching
   * row is returned (LIMIT 1) since each user should have at most one config.
   *
   * @param config — DBConfig (unused here).
   * @param userId — The user_id to look up the config for.
   * @returns The config row object, or null if not found.
   */
  async findSystemConfigByUserId(config: DBConfig, userId: string) {
    try {
      if (!userId) {
        console.warn('[PostgresAdapter] findSystemConfigByUserId called with no userId')
        return null
      }

      await this.connect()
      const result = await this.client.query(
        `SELECT * FROM nxf_system_config WHERE user_id = $1 LIMIT 1`,
        [userId]
      )

      if (result.rows.length === 0) {
        console.log('[PostgresAdapter] No system config found for user')
        return null
      }

      console.log('[PostgresAdapter] System config retrieved successfully')
      return result.rows[0]

    } catch (error) {
      console.error('[PostgresAdapter] findSystemConfigByUserId failed:', error)
      throw new Error(
        `PostgresAdapter.findSystemConfigByUserId failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Table Creation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * createTable
   *
   * Dynamically creates a new table in PostgreSQL from a schema definition.
   * Uses CREATE TABLE IF NOT EXISTS so it is safe to call repeatedly without
   * causing errors if the table already exists.
   *
   * Accepts the columns either as an array of ColumnDef objects or as a
   * key → ColumnDef map (the key becomes the column name in that case).
   *
   * Supported column types and their PostgreSQL mappings:
   *   uuid              → UUID
   *   string / text     → TEXT
   *   json / jsonb /
   *   array             → JSONB
   *   datetime / date /
   *   timestamp (...)   → TIMESTAMP
   *   integer / int     → INTEGER
   *   bigint            → BIGINT
   *   boolean           → BOOLEAN
   *   float / number /
   *   decimal / double  → DOUBLE PRECISION
   *
   * Column constraints supported:
   *   is_primary → PRIMARY KEY
   *   unique     → UNIQUE
   *   nullable: false → NOT NULL
   *
   * @param tableName — The name of the table to create.
   * @param schema    — An object with a `columns` property (array or map).
   * @throws If an unsupported column type is encountered.
   */
  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, ColumnDef> }
  ) {
    await this.connect()

    // Normalise columns to a flat array regardless of input shape
    let columnsArray: ColumnDef[] = []
    if (Array.isArray(schema.columns))
      columnsArray = schema.columns
    else if (typeof schema.columns === 'object')
      columnsArray = Object.entries(schema.columns).map(([name, col]) => ({ ...col, name }))

    const columnsSql = columnsArray
      .map((col) => {
        let typeSql = ''
        switch (col.type.toLowerCase()) {
          case 'uuid':                                                typeSql = 'UUID';             break
          case 'string': case 'text':                                 typeSql = 'TEXT';             break
          case 'json':   case 'jsonb': case 'array':                  typeSql = 'JSONB';            break
          case 'datetime': case 'date': case 'timestamp':
          case 'timestamp with time zone':                            typeSql = 'TIMESTAMP';        break
          case 'integer': case 'int':                                 typeSql = 'INTEGER';          break
          case 'bigint':                                              typeSql = 'BIGINT';           break
          case 'boolean':                                             typeSql = 'BOOLEAN';          break
          case 'float': case 'number': case 'decimal': case 'double': typeSql = 'DOUBLE PRECISION'; break
          default: throw new Error(`Unsupported Postgres column type: ${col.type}`)
        }

        const constraints: string[] = []
        if (col.is_primary)     constraints.push('PRIMARY KEY')
        if (col.unique)         constraints.push('UNIQUE')
        if (col.nullable === false) constraints.push('NOT NULL')

        return `"${col.name}" ${typeSql} ${constraints.join(' ')}`
      })
      .join(',')

    await this.client.query(
      `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnsSql})`
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Data Models
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * CreateDataModels
   *
   * Scaffolds the default data model tables for a project by delegating to
   * the shared `CreateUserDataModels` utility.
   *
   * This method is called after a new project is created to ensure the
   * standard set of database tables (as defined by the project type) exists
   * and is ready to use.
   *
   * @param projectId           — The UUID of the project to scaffold models for.
   * @param selectedProjectType — The project type key (e.g. 'saas', 'ecommerce').
   * @returns The result of CreateUserDataModels (varies by implementation).
   * @throws If no projectId is provided.
   */
  async CreateDataModels(projectId: string, selectedProjectType: string) {
    if (!projectId) throw new Error('Project ID is required')
    return await CreateUserDataModels(this, projectId, selectedProjectType, [])
  }

  /**
   * createDataModelsFromUserEmail
   *
   * Convenience wrapper that looks up a user by email, finds their project,
   * and then calls CreateDataModels for that project.
   *
   * Useful during the installer flow where we have the admin's email but not
   * their project_id directly.
   *
   * @param email               — The user's email address.
   * @param selectedProjectType — The project type key.
   * @throws If the user or their project cannot be found.
   */
  async createDataModelsFromUserEmail(email: string, selectedProjectType: string) {
    const user = await this.findUserByEmail(this.config, email)
    if (!user?.user_id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.user_id)
    if (!project?.project_id) throw new Error('Project not found')

    return this.CreateDataModels(project.project_id, selectedProjectType)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // User Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * createAdminUser
   *
   * Creates a new user record in nxf_users with the 'admin' role and
   * `email_verified: true`. Used during the installer setup to seed the
   * first administrator account.
   *
   * The password is hashed via hashPassword() before being stored.
   * A new UUID is generated for user_id if one is not provided.
   *
   * @param config — DBConfig passed through to create().
   * @param data   — User data including user_email, password, and optionally
   *                 user_id, full_name, role, and notes.
   * @returns The inserted nxf_users row.
   */
  async createAdminUser(config: DBConfig, data: any) {
    const { user_id, user_email, password, role = 'admin', ...rest } = data
    const hashed = await this.hashPassword(password)

    return this.create(config, 'nxf_users', {
      user_id:        user_id || crypto.randomUUID(),
      user_email,
      password_hash:  hashed,
      full_name:      rest.full_name || null,
      role,
      status:         'active',
      email_verified: true,
      token:          null,
      token_ttl:      null,
      notes:          rest.notes || null,
      created_at:     new Date(),
      updated_at:     new Date(),
      is_logged_in:   false,
      last_login:     new Date(),
    })
  }

  /**
   * findUserByEmail
   *
   * Looks up a single user record in nxf_users by their email address.
   * Returns null if no matching user exists.
   *
   * @param config — DBConfig passed through to read().
   * @param email  — The email address to search for (matched against user_email).
   * @returns The user row object, or null if not found.
   */
  async findUserByEmail(config: DBConfig, email: string) {
    const rows = await this.read(config, 'nxf_users', { user_email: email })
    return rows?.[0] || null
  }

  /**
   * findUserByToken
   *
   * Looks up a user by their one-time verification/reset token.
   * Only returns a result if the token has not expired (token_ttl > NOW()).
   * Used by verifyEmail() and updatePasswordByToken().
   *
   * @param token — The one-time token string to search for.
   * @returns The matching user row, or null if the token is invalid or expired.
   */
  async findUserByToken(token: string) {
    await this.connect()
    const res = await this.client.query(
      `SELECT * FROM nxf_users WHERE token=$1 AND token_ttl > NOW() LIMIT 1`,
      [token]
    )
    return res.rows[0] || null
  }

  /**
   * findUserByEmailWithRetry
   *
   * Attempts to find a user by email, retrying up to `retries` times with
   * a `delay` millisecond pause between each attempt.
   *
   * This is needed after registration flows where there may be a brief
   * replication or commit delay before the newly inserted user becomes
   * visible to a subsequent read query.
   *
   * @param config  — DBConfig passed through to findUserByEmail().
   * @param email   — The email address to search for.
   * @param retries — Maximum number of attempts (default: 5).
   * @param delay   — Milliseconds to wait between attempts (default: 300).
   * @returns The user row if found within the retry window, otherwise null.
   */
  async findUserByEmailWithRetry(
    config:  DBConfig,
    email:   string,
    retries: number = 5,
    delay:   number = 300
  ) {
    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(config, email)
      if (user) return user
      await new Promise(r => setTimeout(r, delay))
    }
    return null
  }

  /**
   * verifyEmail
   *
   * Marks a user's email address as verified and clears their one-time token.
   *
   * Looks up the user by the provided token (which must not be expired).
   * On success, sets email_verified to true, clears token and token_ttl,
   * and updates the updated_at timestamp.
   *
   * @param config — DBConfig (unused here).
   * @param data   — Object containing the verification token (and optionally email).
   * @returns { success: true } on success.
   * @throws If the token is invalid or expired.
   */
  async verifyEmail(
    config: DBConfig,
    data:   { token: string; email?: string }
  ): Promise<{ success: boolean; message?: string }> {
    const user = await this.findUserByToken(data.token)
    if (!user) throw new Error('Invalid or expired verification token')

    await this.client.query(
      `UPDATE nxf_users 
       SET email_verified=true, token=NULL, token_ttl=NULL, updated_at=NOW()
       WHERE user_id=$1`,
      [user.user_id]
    )

    return { success: true }
  }

  /**
   * resendVerificationEmail
   *
   * Generates a fresh verification token for a user and updates their record.
   * The new token expires 24 hours from now.
   *
   * Called when the user requests a new verification email (e.g. if the
   * original one expired or was not received). The caller is responsible for
   * actually sending the email — this method only updates the token in the DB.
   *
   * @param config — DBConfig passed through to findUserByEmail().
   * @param email  — The user's email address.
   * @returns { success: true, token: string } — the new token for use in the email link.
   * @throws If no user with that email exists.
   */
  async resendVerificationEmail(config: DBConfig, email: string) {
    const user = await this.findUserByEmail(config, email)
    if (!user) throw new Error('User not found')

    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.client.query(
      `UPDATE nxf_users 
       SET token=$1, token_ttl=$2, updated_at=NOW()
       WHERE user_id=$3`,
      [token, ttl, user.user_id]
    )

    return { success: true, token }
  }

  /**
   * updatePasswordByToken
   *
   * Sets a new password for the user identified by a valid (non-expired) token.
   * Clears the token after use so it cannot be reused.
   *
   * ⚠️  Note: The password passed to this method should already be hashed
   * by the caller before being provided here. The commented-out hashPassword()
   * call is intentionally left out — do not uncomment without confirming the
   * calling code is not double-hashing.
   *
   * @param token       — The password-reset token identifying the user.
   * @param newPassword — The new (pre-hashed) password to store.
   * @returns { success: true } on success.
   * @throws If the token is invalid or expired.
   */
  async updatePasswordByToken(token: string, newPassword: string) {
    const user = await this.findUserByToken(token)
    if (!user) throw new Error('Invalid or expired token')

    await this.client.query(
      `UPDATE nxf_users
       SET password_hash=$1, token=NULL, token_ttl=NULL, updated_at=NOW()
       WHERE user_id=$2`,
      [newPassword, user.user_id]
    )

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * loginBasic
   *
   * Core credential-checking logic shared by all SQL-based login methods.
   * Looks up the user by email, verifies the password hash, and optionally
   * checks whether the email has been verified.
   *
   * Returns a plain result object rather than throwing so callers can handle
   * failure cases gracefully without try/catch.
   *
   * @param config                — DBConfig passed through to findUserByEmail().
   * @param email                 — The user's email address.
   * @param password              — The plaintext password to verify.
   * @param emailVerifiedRequired — If true, blocks login for unverified emails.
   *                                Defaults to true.
   * @returns { success, user?, error? }
   */
  async loginBasic(
    config:                DBConfig,
    email:                 string,
    password:              string,
    emailVerifiedRequired: boolean = true
  ) {
    const user = await this.findUserByEmail(config, email)
    if (!user) return { success: false, error: 'User not found.' }
    if (!user.password_hash) return { success: false, error: 'Invalid password' }

    const valid = await bcrypt.compare(password.trim(), user.password_hash.trim())
    if (!valid) return { success: false, error: 'Invalid email or password' }

    if (emailVerifiedRequired && !user.email_verified)
      return { success: false, error: 'Please verify your email', user }

    return {
      success: true,
      user: {
        user_id:        user.user_id,
        user_email:     user.user_email,
        full_name:      user.full_name,
        role:           user.role,
        status:         user.status,
        email_verified: user.email_verified,
      },
    }
  }

  /**
   * loginWithPostgres
   *
   * The full login flow for PostgreSQL-backed projects. Builds on loginBasic()
   * by adding an admin-role check and creating a session token pair.
   *
   * Steps:
   * 1. Verify credentials via loginBasic().
   * 2. Reject non-admin users (only admins can access the console).
   * 3. Look up the user's project.
   * 4. Generate a UUID access token (1-hour expiry) and refresh token (7-day expiry).
   * 5. Persist the token pair to nxf_system_tokens.
   * 6. Return the user, tokens, and project ID to the caller.
   *
   * Optional `ip` and `ua` parameters allow recording the client's IP address
   * and user agent in the token record for audit and security purposes.
   *
   * @param config — DBConfig passed through to loginBasic() and findProjectByOwnerId().
   * @param email  — The user's email address.
   * @param password — The plaintext password.
   * @param ip     — Optional: the client's IP address.
   * @param ua     — Optional: the client's user agent string.
   * @returns { success, user?, accessToken?, refreshToken?, projectId?, error? }
   */
  async loginWithPostgres(
    config:   DBConfig,
    email:    string,
    password: string,
    ip?:      string,
    ua?:      string
  ) {
    const basic = await this.loginBasic(config, email, password)
    if (!basic.success || !basic.user) return { success: false, error: basic.error }

    // Only admin users are permitted to access the management console
    if (basic.user.role !== 'admin') {
      return {
        success: false,
        error:   'You do not have admin rights to access the console',
        user:    basic.user,
      }
    }

    const project = await this.findProjectByOwnerId(config, basic.user.user_id)
    if (!project) return { success: false, error: 'No project found for user' }

    const accessToken  = crypto.randomUUID()
    const refreshToken = crypto.randomUUID()

    await this.create(config, 'nxf_system_tokens', {
      token_id:           crypto.randomUUID(),
      user_id:            basic.user.user_id,
      project_id:         project.project_id,
      access_token:       accessToken,
      refresh_token:      refreshToken,
      token_type:         'bearer',
      expires_at:         new Date(Date.now() + 3600 * 1000),          // 1 hour
      refresh_expires_at: new Date(Date.now() + 7 * 86400 * 1000),     // 7 days
      ip_address:         ip || null,
      user_agent:         ua || null,
      revoked:            false,
      created_at:         new Date(),
      updated_at:         new Date(),
    })

    return {
      success:      true,
      user:         basic.user,
      accessToken,
      refreshToken,
      projectId:    project.project_id,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Registration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * registerUser
   *
   * Creates a new user account and an associated default project.
   *
   * Steps:
   * 1. Check whether a user with that email already exists (prevents duplicates).
   * 2. Hash the password.
   * 3. Insert the user record into nxf_users with email_verified: false.
   * 4. Create a default project for the user in nxf_system_projects.
   * 5. Return the new user's ID, project ID, and verification token.
   *
   * The caller is responsible for sending the verification email using the
   * returned token (embedded in a /verify-email link).
   *
   * @param config — DBConfig passed through to create() and findUserByEmail().
   * @param data   — Registration data: email, password, full_name, token, token_ttl.
   * @returns { success, user_id, project_id, token, token_ttl }
   * @throws If a user with that email already exists.
   */
  async registerUser(
    config: DBConfig,
    data: {
      email:      string
      password:   string
      full_name?: string
      token:      string
      token_ttl:  Date
    }
  ) {
    const existing = await this.findUserByEmail(config, data.email)
    if (existing) throw new Error('User exists')

    const user_id       = crypto.randomUUID()
    const password_hash = await this.hashPassword(data.password)

    await this.create(config, 'nxf_users', {
      user_id,
      user_email:     data.email,
      password_hash,
      full_name:      data.full_name || null,
      role:           'user',
      status:         'active',
      email_verified: false,
      token:          data.token,
      token_ttl:      data.token_ttl,
      is_logged_in:   false,
      created_at:     new Date(),
      updated_at:     new Date(),
    })

    const project_id = await this.createProject(config, {
      name:    'Default Project',
      user_id,
    })

    return { success: true, user_id, project_id, token: data.token, token_ttl: data.token_ttl }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Token Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * findTokenByAccessToken
   *
   * Retrieves a token record from nxf_system_tokens by its access_token value.
   * Used by the session validation flow to check whether an incoming Bearer
   * token is valid, unexpired, and not revoked.
   *
   * @param accessToken — The raw access token string from the Authorization header.
   * @returns The token row, or null if not found.
   */
  async findTokenByAccessToken(accessToken: string) {
    await this.connect()
    const res = await this.client.query(
      `SELECT * FROM nxf_system_tokens WHERE access_token=$1 LIMIT 1`,
      [accessToken]
    )
    return res.rows?.[0] || null
  }

  /**
   * findTokenByRefreshToken
   *
   * Retrieves a token record from nxf_system_tokens by its refresh_token value.
   * Used during the token refresh flow to locate the session record that
   * corresponds to a submitted refresh token.
   *
   * @param refreshToken — The raw refresh token string.
   * @returns The token row, or null if not found.
   */
  async findTokenByRefreshToken(refreshToken: string) {
    await this.connect()
    const res = await this.client.query(
      `SELECT * FROM nxf_system_tokens WHERE refresh_token=$1 LIMIT 1`,
      [refreshToken]
    )
    return res.rows?.[0] || null
  }

  /**
   * extendToken
   *
   * Applies partial updates to an existing token record in nxf_system_tokens.
   * Used to extend an access token's expiry after a successful refresh, or to
   * mark a token as revoked on logout.
   *
   * Only the fields present in `updates` are changed — unspecified fields are
   * left untouched. The method builds the SET clause dynamically and uses
   * parameterised values to prevent SQL injection.
   *
   * @param tokenId — The token_id (UUID) of the record to update.
   * @param updates — Partial object with any of: revoked, expires_at, updated_at.
   */
  async extendToken(
    tokenId: string,
    updates: Partial<{ revoked: boolean; updated_at: string; expires_at: string }>
  ) {
    const setClauses: string[] = []
    const values: any[]        = []
    let i = 1

    if (updates.revoked !== undefined) {
      setClauses.push(`revoked = $${i++}`)
      values.push(updates.revoked)
    }
    if (updates.expires_at) {
      setClauses.push(`expires_at = $${i++}`)
      values.push(updates.expires_at)
    }
    if (updates.updated_at) {
      setClauses.push(`updated_at = $${i++}`)
      values.push(updates.updated_at)
    }

    // Nothing to update — exit early to avoid a malformed query
    if (!setClauses.length) return

    const query = `
      UPDATE nxf_system_tokens 
      SET ${setClauses.join(', ')} 
      WHERE token_id = $${i}
    `
    values.push(tokenId)

    await this.client.query(query, values)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Password Reset
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * createPasswordResetToken
   *
   * Generates a one-time password-reset token for the user with the given email
   * and stores it in nxf_users with a 1-hour expiry.
   *
   * The caller is responsible for emailing the token to the user (embedded in a
   * reset link). Once the user clicks the link, updatePasswordByToken() is used
   * to apply the new password and clear the token.
   *
   * @param email — The email address of the user requesting a password reset.
   * @returns The new one-time reset token string.
   * @throws If no user with that email exists.
   */
  async createPasswordResetToken(email: string) {
    const user = await this.findUserByEmail(this.config, email)
    if (!user) throw new Error('User not found')

    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await this.client.query(
      `UPDATE nxf_users 
       SET token=$1, token_ttl=$2, updated_at=NOW()
       WHERE user_id=$3`,
      [token, ttl, user.user_id]
    )

    return token
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Project
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * createProject
   *
   * Inserts a new project record into nxf_system_projects and returns the
   * generated project_id UUID.
   *
   * Each user in the system is associated with exactly one project. This method
   * is called automatically by registerUser() immediately after the user record
   * is created.
   *
   * @param config — DBConfig passed through to create().
   * @param data   — Object containing the project name and the owning user_id.
   * @returns The new project_id UUID string.
   */
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const project_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_projects', {
      project_id,
      name:       data.name,
      user_id:    data.user_id,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return project_id
  }

  /**
   * findProjectByOwnerId
   *
   * Retrieves the project record associated with a given user_id.
   * Returns null if no project exists for that user.
   *
   * @param config  — DBConfig passed through to read().
   * @param ownerId — The user_id of the project owner.
   * @returns The project row object, or null if not found.
   */
  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const rows = await this.read(config, 'nxf_system_projects', { user_id: ownerId })
    return rows?.[0] || null
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tenant
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * createTenant
   *
   * Creates a new tenant record in nxf_system_tenants.
   * A tenant represents a subdomain-based workspace in a multi-tenant setup.
   *
   * @param config — DBConfig passed through to create().
   * @param data   — Object containing subdomain and the owner's user_email.
   * @returns The new ten_id UUID string.
   */
  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const ten_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_tenants', {
      ten_id,
      subdomain:  data.subdomain,
      user_email: data.user_email,
      created_at: new Date(),
    })
    return ten_id
  }

  /**
   * findTenantByUserEmail
   *
   * Retrieves the tenant record linked to a given user email address.
   * Returns null if no matching tenant exists.
   *
   * @param config — DBConfig passed through to read().
   * @param email  — The user's email address to search by.
   * @returns The tenant row object, or null if not found.
   */
  async findTenantByUserEmail(config: DBConfig, email: string) {
    const rows = await this.read(config, 'nxf_system_tenants', { user_email: email })
    return rows?.[0] || null
  }

  /**
   * saveInstallerConfig
   *
   * Persists the full installer configuration to the nxf_system_config table.
   * Called at the end of the installer wizard after all settings have been
   * collected and validated.
   *
   * @param config — DBConfig passed through to create().
   * @param data   — The installer state object to persist.
   * @returns The new config_id UUID string.
   */
  async saveInstallerConfig(config: DBConfig, data: any) {
    const config_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_config', {
      config_id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return config_id
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Storage
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * setupStorageBuckets
   *
   * Ensures all default storage folders exist in the nxf_storage table.
   * Checks each folder in DEFAULT_BUCKETS and creates a placeholder record
   * for any that are missing. Safe to call multiple times — existing records
   * are not duplicated.
   *
   * Called during initial project setup to seed the media library structure.
   *
   * @returns { success: true, buckets: string[] }
   */
  async setupStorageBuckets() {
    for (const folder of this.DEFAULT_BUCKETS) {
      const existing = await this.read(this.config, 'nxf_storage', { folder })
      if (!existing?.length) {
        await this.create(this.config, 'nxf_storage', {
          storage_id: crypto.randomUUID(),
          folder,
          file_name:  '',
          file_path:  folder,
          created_at: new Date(),
        })
      }
    }
    return { success: true, buckets: this.DEFAULT_BUCKETS }
  }

  /**
   * createBucket
   *
   * Creates a single custom storage folder record in nxf_storage.
   * Used when the user creates a new folder through the media library UI.
   *
   * @param folder — The folder path/name to create (e.g. "uploads/custom").
   * @returns The inserted nxf_storage row.
   */
  async createBucket(folder: string) {
    return this.create(this.config, 'nxf_storage', {
      storage_id: crypto.randomUUID(),
      folder,
      file_name:  '',
      file_path:  folder,
      created_at: new Date(),
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Demo Content
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * installDemoContent
   *
   * Seeds the database with demo data from JSON files stored on disk.
   * Used by the installer to populate the project with sample content so
   * the user can see a working example immediately after setup.
   *
   * How it works:
   * 1. Builds a list of folder paths based on the selected project type:
   *      <selectedProjectType>_models/   — project-type-specific demo data
   *      system_models/                  — core system table demo data
   *      users_models/                   — user account demo data
   * 2. Scans each folder for .json files.
   * 3. For each file, parses the JSON and extracts the rows array (either
   *    the root array or the `demo_data` key within the object).
   * 4. Inserts each row into the table whose name matches the filename
   *    (e.g. "nxf_products.json" → inserts into the "nxf_products" table).
   * 5. JSONB values (objects/arrays) are stringified before insertion.
   * 6. Individual row insert failures are logged and skipped — one bad row
   *    does not abort the entire import.
   *
   * Returns a summary object rather than throwing on partial failures, so the
   * installer can report the outcome without crashing.
   *
   * @param config              — DBConfig (unused here; connection managed by class).
   * @param selectedProjectType — The project type key (e.g. 'saas', 'ecommerce').
   * @returns { success, inserted, skipped, message }
   */
  async installDemoContent(
    config:               DBConfig,
    selectedProjectType:  string
  ): Promise<{
    success:   boolean
    message?:  string
    inserted?: number
    skipped?:  boolean
  }> {
    try {
      const fs   = require('fs')
      const path = require('path')

      await this.connect()

      // Build the list of demo content folder paths to scan
      const modelFolders = [
        `${selectedProjectType}_models`,
        'system_models',
        'users_models',
      ]
      const basePaths = modelFolders.map(folder =>
        path.resolve(process.cwd(), '..', 'demo_content', folder)
      )

      let inserted = 0

      for (const basePath of basePaths) {
        console.log('[PostgresAdapter] Checking demo content path:', basePath)

        if (!fs.existsSync(basePath)) {
          console.log('[PostgresAdapter] Demo content folder not found, skipping:', basePath)
          continue
        }

        const files = fs
          .readdirSync(basePath)
          .filter((f: string) => f.endsWith('.json'))

        for (const file of files) {
          const fullPath = path.join(basePath, file)
          const raw      = fs.readFileSync(fullPath, 'utf-8')

          let json: any
          try {
            json = JSON.parse(raw)
          } catch (e: any) {
            console.warn(`[PostgresAdapter] Invalid JSON in demo file ${file}:`, e.message)
            continue
          }

          // The table name is derived from the filename (without the .json extension)
          const tableName = file.replace('.json', '')

          // Support both a root array and an object with a demo_data key
          const rows = Array.isArray(json) ? json : json?.demo_data
          if (!rows || !Array.isArray(rows)) {
            console.log(`[PostgresAdapter] No valid data array in ${file}, skipping`)
            continue
          }

          console.log(`[PostgresAdapter] Inserting ${rows.length} rows into "${tableName}"`)

          for (const row of rows) {
            const keys   = Object.keys(row)

            /**
             * Normalise values for PostgreSQL:
             * - null/undefined → null
             * - Objects and arrays → JSON.stringify() for JSONB columns
             * - All other values → pass through as-is
             */
            const values = keys.map(key => {
              const val = row[key]
              if (val === null || val === undefined) return null
              if (typeof val === 'object') return JSON.stringify(val)
              return val
            })

            const columns      = keys.map(k => `"${k}"`).join(',')
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(',')
            const sql          = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`

            try {
              await this.client.query(sql, values)
              inserted++
            } catch (err: any) {
              // Log and skip individual row failures so one bad row doesn't abort the import
              console.warn(`[PostgresAdapter] Failed to insert row into "${tableName}":`, err.message)
            }
          }
        }
      }

      return {
        success:  true,
        inserted,
        skipped:  false,
        message:  'Demo content installed successfully',
      }

    } catch (err: any) {
      return {
        success:  false,
        inserted: 0,
        skipped:  true,
        message:  err.message || 'Failed to install demo content',
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * getPostgresAdapter
 *
 * Factory function that creates and returns a new PostgresAdapter instance.
 *
 * Using a factory function (rather than calling `new PostgresAdapter()` directly)
 * keeps the instantiation pattern consistent with other adapters in the codebase
 * and makes it easier to swap or mock the adapter in tests.
 *
 * @param config — The DBConfig to initialise the adapter with.
 * @returns A new PostgresAdapter instance.
 */
export function getPostgresAdapter(config: DBConfig) {
  return new PostgresAdapter(config)
}