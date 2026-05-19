/**
 * MySQLAdapter
 *
 * A database adapter class that implements the DBAdapter interface for MySQL.
 * It provides all the database operations needed by the NXTFlutter CMS —
 * from basic CRUD to user authentication, project management, session tokens,
 * installer config saving, and demo content installation.
 *
 * This adapter uses `mysql2/promise` for async/await MySQL queries and
 * maintains a pool of reusable database connections for efficiency.
 *
 * Key responsibilities:
 * - CRUD operations (create, read, update, delete) on any table.
 * - User registration, login, email verification, and password reset.
 * - Session token creation, lookup, and extension.
 * - Project and tenant management.
 * - Installer config persistence.
 * - Storage bucket initialisation.
 * - Demo content installation from JSON files.
 *
 * Security notes:
 * - Passwords are always hashed with bcrypt (10 salt rounds) before storage.
 * - Raw passwords are NEVER logged at any point.
 * - Tokens are NEVER logged — only step/status messages are logged.
 * - SQL queries use parameterised placeholders (`?`) to prevent SQL injection.
 *
 * Connection pooling:
 * - A default pool is created in the constructor for general use.
 * - A secondary pool map (`this.pools`) caches pools keyed by connection
 *   parameters, supporting multi-tenant scenarios where different configs
 *   may be passed per request.
 */

import mysql, { RowDataPacket } from 'mysql2/promise'
import bcrypt                   from 'bcrypt'
import crypto                   from 'crypto'
import { DBConfig, DBAdapter, ColumnDef } from '../types'
import { CreateUserDataModels } from '../utils/create-data-models'

export class MySQLAdapter implements DBAdapter {
  /** The default connection pool created from the constructor config. */
  private pool: mysql.Pool

  /** The database config this adapter was initialised with. */
  public config: DBConfig

  /**
   * A cache of additional connection pools keyed by connection parameters.
   * Used when different DBConfig objects are passed to individual methods,
   * as is common in multi-tenant or installer scenarios.
   */
  private pools: Record<string, mysql.Pool> = {}

  /**
   * DEFAULT_BUCKETS
   *
   * The list of storage folder names created during initial setup.
   * Each entry becomes a row in the `nxf_storage` table representing
   * a logical storage "bucket" for file organisation.
   */
  private readonly DEFAULT_BUCKETS = [
    'system', 'themes', 'extensions', 'projects',
    'avatars', 'logos', 'uploads',
  ]

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  /**
   * Creates a new MySQLAdapter instance and initialises the default
   * connection pool.
   *
   * Validates that all required config fields are present before attempting
   * to create the pool, throwing descriptive errors if anything is missing.
   *
   * @param config - The database connection configuration.
   * @throws If config, config.user, config.password, or config.database is missing.
   */
  constructor(config: DBConfig) {
    if (!config)           throw new Error('DBConfig must be provided via adapter')
    if (!config.user)      throw new Error('MySQLAdapter: config.user is required')
    if (!config.password)  throw new Error('MySQLAdapter: config.password is required')
    if (!config.database)  throw new Error('MySQLAdapter: config.database is required')

    this.config = config

    /**
     * Create the default connection pool.
     * - `waitForConnections: true` — queues requests when all connections are busy.
     * - `connectionLimit: 10`      — allows up to 10 concurrent connections.
     */
    this.pool = mysql.createPool({
      host:               config.host || 'localhost',
      user:               config.user,
      password:           config.password,
      database:           config.database,
      port:               config.port ? Number(config.port) : 3306,
      waitForConnections: true,
      connectionLimit:    10,
    })
  }

  // -------------------------------------------------------------------------
  // Private: pool management
  // -------------------------------------------------------------------------

  /**
   * getPool
   *
   * Returns a connection pool for the given config, creating and caching
   * a new one if one doesn't already exist for that connection.
   *
   * The cache key is `host_database_user` — unique per connection target.
   * This prevents creating a new pool on every method call when the same
   * config is passed repeatedly.
   *
   * @param config - The database config to get or create a pool for.
   * @returns       A mysql2 connection Pool.
   * @throws If any required credential field is missing.
   */
  private async getPool(config: DBConfig): Promise<mysql.Pool> {
    const key = `${config.host}_${config.database}_${config.user}`

    if (!this.pools[key]) {
      if (!config.user || !config.password || !config.database) {
        throw new Error('MySQLAdapter.getPool: Missing DB credentials')
      }

      this.pools[key] = mysql.createPool({
        host:               config.host || 'localhost',
        port:               Number(config.port) || 3306,
        user:               config.user,
        password:           config.password,
        database:           config.database,
        waitForConnections: true,
        connectionLimit:    10,
      })
    }

    return this.pools[key]
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  /**
   * connect
   *
   * Acquires a connection from the default pool and immediately releases it.
   * Used to verify the pool is working without executing a query.
   */
  async connect(): Promise<void> {
    const conn = await this.pool.getConnection()
    conn.release()
  }

  /**
   * testConnection
   *
   * Attempts to connect to the database and returns a success/failure result.
   * Used by the installer to validate the user's database credentials
   * before proceeding with setup.
   *
   * @returns { success: boolean, message: string }
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.connect()
      return { success: true, message: 'Connected to MySQL successfully.' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to MySQL' }
    }
  }

  // -------------------------------------------------------------------------
  // Password helpers
  // -------------------------------------------------------------------------

  /**
   * hashPassword
   *
   * Hashes a plain-text password using bcrypt with 10 salt rounds.
   * 10 rounds is the industry standard — strong enough to resist brute-force
   * attacks while still being fast enough for normal use.
   *
   * SECURITY: The raw password is never stored or logged — only the hash.
   *
   * @param password - The plain-text password to hash.
   * @returns          The bcrypt hash string.
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  /**
   * comparePassword
   *
   * Compares a plain-text password against a stored bcrypt hash.
   * Used during login to verify the user's password without storing it.
   *
   * @param password - The plain-text password to check.
   * @param hash     - The stored bcrypt hash to compare against.
   * @returns          True if the password matches, false otherwise.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // -------------------------------------------------------------------------
  // Basic CRUD
  // -------------------------------------------------------------------------

  /**
   * create
   *
   * Inserts a new row into the specified table.
   *
   * Pre-processes values before insertion:
   * - `undefined` ID fields → auto-generates a UUID.
   * - `Date` objects → converted to MySQL DATETIME string format.
   * - Objects/arrays → JSON-serialised to strings (stored as JSON/TEXT columns).
   *
   * Uses parameterised queries (`?` placeholders) to prevent SQL injection.
   *
   * @param config - The database config (used to get the right pool).
   * @param table  - The table name to insert into.
   * @param data   - A key-value map of column names to values.
   * @returns       The mysql2 query result (includes insertId for auto-increment tables).
   */
  async create(
    config: DBConfig,
    table: string,
    data: Record<string, any>
  ): Promise<any> {
    const pool    = await this.getPool(config)
    const cleaned: Record<string, any> = {}

    for (const key in data) {
      let value = data[key]
      // Auto-generate UUID for undefined ID fields
      if (value === undefined && key.toLowerCase().includes('id')) {
        value = crypto.randomUUID()
      }
      // Convert Dates to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      if (value instanceof Date) {
        cleaned[key] = value.toISOString().slice(0, 19).replace('T', ' ')
      } else if (typeof value === 'object' && value !== null) {
        // Serialise objects/arrays to JSON strings for storage
        cleaned[key] = JSON.stringify(value)
      } else {
        cleaned[key] = value
      }
    }

    const keys         = Object.keys(cleaned)
    const placeholders = keys.map(() => '?').join(',')
    const values       = Object.values(cleaned)
    const sql          = `INSERT INTO \`${table}\` (${keys.join(',')}) VALUES (${placeholders})`

    const [result] = await pool.query(sql, values)
    return result
  }

  /**
   * read
   *
   * Reads rows from the specified table with optional filtering and limiting.
   *
   * Query object behaviour:
   * - Each key-value pair becomes a `WHERE key = ?` condition (AND-joined).
   * - A `limit` key is treated as a LIMIT clause, not a WHERE condition.
   *
   * Post-processes results: any string values that look like JSON objects
   * or arrays are automatically parsed back to JavaScript values.
   *
   * @param config - The database config.
   * @param table  - The table name to read from.
   * @param query  - Optional filter/limit object.
   * @returns       An array of matching rows with JSON fields auto-parsed.
   */
  async read(config: DBConfig, table: string, query?: any): Promise<any> {
    const pool = await this.getPool(config)

    let sql         = `SELECT * FROM \`${table}\``
    const values:   any[] = []
    let limitClause = ''

    if (query && Object.keys(query).length) {
      const whereParts: string[] = []

      for (const key of Object.keys(query)) {
        if (key === 'limit') {
          limitClause = ` LIMIT ${Number(query[key])}`
          continue
        }
        whereParts.push(`\`${key}\` = ?`)
        values.push(query[key])
      }

      if (whereParts.length) {
        sql += ` WHERE ${whereParts.join(' AND ')}`
      }
    }

    sql += limitClause

    const [rows]: any = await pool.query(sql, values)

    // Auto-parse JSON strings back into objects/arrays
    return rows.map((row: any) => {
      for (const key in row) {
        const val = row[key]
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { row[key] = JSON.parse(val) } catch {}
        }
      }
      return row
    })
  }

  /**
   * update
   *
   * Updates a row in the specified table identified by a given ID value.
   *
   * The `idColumn` parameter allows specifying which column is the primary key
   * (defaults to 'id') — necessary because different tables use different
   * primary key column names (e.g. 'user_id', 'project_id').
   *
   * Date values are automatically converted to MySQL DATETIME format.
   *
   * @param config   - The database config.
   * @param table    - The table name to update.
   * @param id       - The value of the ID to match in the WHERE clause.
   * @param data     - Key-value pairs of columns to update.
   * @param idColumn - The name of the primary key column (default: 'id').
   * @returns         The mysql2 query result.
   */
  async update(
    config:   DBConfig,
    table:    string,
    id:       string,
    data:     Record<string, any>,
    idColumn: string = 'id'
  ): Promise<any> {
    const pool   = await this.getPool(config)
    const keys   = Object.keys(data)
    const values = keys.map((k) => {
      const value = data[k]
      if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ')
      return value
    })

    const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ')
    values.push(id) // Add the ID value for the WHERE clause

    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${idColumn}\` = ?`
    const [result] = await pool.query(sql, values)
    return result
  }

  /**
   * delete
   *
   * Deletes a row from the specified table by its `id` column value.
   *
   * @param config - The database config.
   * @param table  - The table name to delete from.
   * @param id     - The value of the `id` column to match.
   * @returns       The mysql2 query result.
   */
  async delete(config: DBConfig, table: string, id: string): Promise<any> {
    const pool       = await this.getPool(config)
    const sql        = `DELETE FROM \`${table}\` WHERE id = ?`
    const [result]   = await pool.query(sql, [id])
    return result
  }

  // -------------------------------------------------------------------------
  // System config
  // -------------------------------------------------------------------------

  /**
   * findSystemConfigByUserId
   *
   * Looks up the CMS system config record associated with a given user ID.
   * Returns null if no config is found or if userId is not provided.
   *
   * @param config - The database config.
   * @param userId - The user ID to look up the config for.
   * @returns       The config row, or null if not found.
   * @throws If the database query fails.
   */
  async findSystemConfigByUserId(
    config: DBConfig,
    userId: string
  ): Promise<any> {
    try {
      console.log('[mysql-adapter] findSystemConfigByUserId: Starting lookup')

      if (!userId) {
        console.warn('[mysql-adapter] findSystemConfigByUserId: No userId provided')
        return null
      }

      const [rows] = await this.pool.execute<RowDataPacket[]>(
        `SELECT * FROM nxf_system_config WHERE user_id = ? LIMIT 1`,
        [userId]
      )

      if (rows.length === 0) {
        console.log('[mysql-adapter] findSystemConfigByUserId: No config found for user')
        return null
      }

      console.log('[mysql-adapter] findSystemConfigByUserId: Config found successfully')
      return rows[0]

    } catch (error) {
      console.error(
        '[mysql-adapter] findSystemConfigByUserId: Query failed:',
        error instanceof Error ? error.message : String(error)
      )
      throw new Error(
        `MySQLAdapter.findSystemConfigByUserId failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // -------------------------------------------------------------------------
  // Table creation
  // -------------------------------------------------------------------------

  /**
   * createTable
   *
   * Creates a new database table using the provided schema definition.
   * Uses `CREATE TABLE IF NOT EXISTS` so it is safe to call repeatedly
   * without failing if the table already exists.
   *
   * Supported column types and their MySQL equivalents:
   * - uuid       → CHAR(36)
   * - string/text → VARCHAR(255) for primary/unique, TEXT otherwise
   * - json/jsonb/array → JSON
   * - datetime/timestamp/date → DATETIME
   * - integer/int → INT
   * - bigint      → BIGINT
   * - boolean     → TINYINT(1) (MySQL's boolean representation)
   * - float/number/decimal/double → FLOAT
   *
   * @param tableName - The name of the table to create.
   * @param schema    - An object with a `columns` array or map of ColumnDef.
   * @throws If columns are missing, empty, or contain unsupported types.
   */
  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, ColumnDef> }
  ): Promise<void> {
    // Normalise columns to an array regardless of whether an array or object was provided
    let columnsArray: ColumnDef[] = []

    if (Array.isArray(schema.columns)) {
      columnsArray = schema.columns
    } else if (schema.columns && typeof schema.columns === 'object') {
      columnsArray = Object.entries(schema.columns).map(([name, col]) => ({ ...col, name }))
    } else {
      throw new Error(`MySQLAdapter.createTable: "columns" must be an array or object`)
    }

    if (!columnsArray.length) {
      throw new Error(`MySQLAdapter.createTable: "columns" cannot be empty`)
    }

    const columnsSql = columnsArray
      .map((col) => {
        // Map abstract column types to MySQL-specific SQL types
        let typeSql = ''
        switch (col.type.toLowerCase()) {
          case 'uuid':                       typeSql = 'CHAR(36)';      break
          case 'string':
          case 'text':
            typeSql = col.is_primary || col.unique ? 'VARCHAR(255)' : 'TEXT'
            break
          case 'jsonb':
          case 'json':
          case 'array':                      typeSql = 'JSON';          break
          case 'datetime':
          case 'timestamp':
          case 'date':
          case 'timestamp with time zone':   typeSql = 'DATETIME';      break
          case 'integer':
          case 'int':                        typeSql = 'INT';           break
          case 'bigint':                     typeSql = 'BIGINT';        break
          case 'boolean':                    typeSql = 'TINYINT(1)';    break
          case 'float':
          case 'number':
          case 'decimal':
          case 'double':                     typeSql = 'FLOAT';         break
          default:
            throw new Error(`Unsupported MySQL column type: ${col.type}`)
        }

        // Build the constraint string for this column
        const constraints: string[] = []
        if (col.is_primary)        constraints.push('PRIMARY KEY')
        if (col.unique)            constraints.push('UNIQUE')
        if (col.nullable === false) constraints.push('NOT NULL')

        return `\`${col.name}\` ${typeSql} ${constraints.join(' ')}`.trim()
      })
      .join(', ')

    const sql = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columnsSql})`
    await this.pool.query(sql)
  }

  // -------------------------------------------------------------------------
  // Data models
  // -------------------------------------------------------------------------

  /**
   * CreateDataModels
   *
   * Creates the CMS data models for the given project and project type.
   * Delegates to the shared `CreateUserDataModels` utility function.
   *
   * @param projectId           - The project to create models for.
   * @param selectedProjectType - The project template type (e.g. 'ecommerce').
   * @returns                    The result from CreateUserDataModels.
   */
  async CreateDataModels(
    projectId: string,
    selectedProjectType: string
  ): Promise<any> {
    return await CreateUserDataModels(this, projectId, selectedProjectType, [])
  }

  /**
   * createDataModelsFromUserEmail
   *
   * Convenience method that looks up the user and their project by email,
   * then creates the data models for that project.
   *
   * @param email               - The admin user's email address.
   * @param selectedProjectType - The project template type.
   * @returns                    The result from CreateDataModels.
   * @throws If the user or their project is not found.
   */
  async createDataModelsFromUserEmail(
    email: string,
    selectedProjectType: string
  ): Promise<any> {
    const user = await this.findUserByEmail(this.config, email)
    if (!user?.user_id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.user_id)
    if (!project?.project_id) throw new Error('Project not found')

    return this.CreateDataModels(project.project_id, selectedProjectType)
  }

  // -------------------------------------------------------------------------
  // User helpers
  // -------------------------------------------------------------------------

  /**
   * createAdminUser
   *
   * Creates a new admin user account in the `nxf_users` table.
   * Hashes the password before storage.
   *
   * SECURITY: The raw password is hashed immediately and never stored or logged.
   *
   * @param config - The database config.
   * @param data   - User fields: user_id, user_email, password, role, full_name, etc.
   * @returns       The mysql2 insert result.
   */
  async createAdminUser(config: DBConfig, data: any): Promise<any> {
    const { user_id, user_email, password, role = 'admin', ...rest } = data
    const hashed = await this.hashPassword(password)

    return this.create(config, 'nxf_users', {
      user_id:        user_id || crypto.randomUUID(),
      user_email,
      password_hash:  hashed,
      full_name:      rest.full_name || null,
      role,
      status:         'active',
      email_verified: 1,
      token:          null,
      token_ttl:      null,
      notes:          rest.notes || null,
      created_at:     new Date(),
      updated_at:     new Date(),
    })
  }

  /**
   * findUserByEmail
   *
   * Looks up a user by their email address.
   *
   * @param config - The database config.
   * @param email  - The email address to search for.
   * @returns       The user row, or null if not found.
   */
  async findUserByEmail(config: DBConfig, email: string): Promise<any> {
    const rows: any = await this.read(config, 'nxf_users', { user_email: email })
    return rows?.length ? rows[0] : null
  }

  /**
   * findUserByEmailWithRetry
   *
   * Attempts to find a user by email, retrying up to `retries` times with
   * a `delay` millisecond pause between each attempt.
   *
   * Why retry? After creating a new user, some databases (especially in
   * high-load situations) may not immediately return the new row on the
   * first read. Retrying handles this eventual-consistency window.
   *
   * @param config  - The database config.
   * @param email   - The email address to search for.
   * @param retries - Maximum number of attempts (default: 5).
   * @param delay   - Milliseconds to wait between retries (default: 300).
   * @returns        The user row if found within the retry window, or null.
   */
  async findUserByEmailWithRetry(
    config:  DBConfig,
    email:   string,
    retries: number = 5,
    delay:   number = 300
  ): Promise<any> {
    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(config, email)
      if (user) return user
      await new Promise((r) => setTimeout(r, delay))
    }
    return null
  }

  /**
   * loginBasic
   *
   * Validates an email/password combination against the database.
   *
   * Checks:
   * 1. User exists.
   * 2. Email is verified.
   * 3. Password matches the stored bcrypt hash.
   *
   * SECURITY: Returns a generic "Invalid email or password" for both
   * "user not found" and "wrong password" cases to prevent user enumeration.
   *
   * @param config   - The database config.
   * @param email    - The user's email address.
   * @param password - The plain-text password to verify.
   * @returns         { success, user } on success or { success, error } on failure.
   */
  async loginBasic(
    config:   DBConfig,
    email:    string,
    password: string
  ): Promise<any> {
    const user = await this.findUserByEmail(config, email)
    if (!user) return { success: false, error: 'Invalid email or password' }
    if (!user.email_verified) return { success: false, error: 'Please verify your email before logging in' }

    const valid = await this.comparePassword(password, user.password_hash)
    if (!valid) return { success: false, error: 'Invalid email or password' }

    return {
      success: true,
      user: {
        user_id:  user.user_id,
        email:    user.user_email,
        full_name: user.full_name,
        role:     user.role   || 'user',
        status:   user.status || 'active',
      },
    }
  }

  /**
   * loginWithMySQL
   *
   * Full admin login flow:
   * 1. Calls `loginBasic` to verify credentials.
   * 2. Checks the user has the 'admin' role (non-admins are rejected).
   * 3. Looks up the user's project.
   * 4. Creates a new session token pair (access + refresh) in `nxf_system_tokens`.
   * 5. Returns the user object, tokens, and project ID.
   *
   * Token expiry:
   * - Access token:  1 hour
   * - Refresh token: 7 days
   *
   * SECURITY: Access and refresh tokens are random UUIDs — never logged.
   *
   * @param config     - The database config.
   * @param email      - The admin's email address.
   * @param password   - The admin's plain-text password.
   * @param ipAddress  - Optional client IP (stored for audit purposes).
   * @param userAgent  - Optional client user agent (stored for audit purposes).
   * @returns           Login result with tokens and project ID, or an error.
   */
  async loginWithMySQL(
    config:     DBConfig,
    email:      string,
    password:   string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const basicLogin = await this.loginBasic(config, email, password)
    if (!basicLogin.success || !basicLogin.user) {
      return { success: false, error: basicLogin.error }
    }

    // Only admin users can access the CMS console
    if (basicLogin.user.role !== 'admin') {
      return {
        success: false,
        error:   'You do not have admin rights to access the console',
        user:    basicLogin.user,
      }
    }

    const projectRows: any = await this.read(
      config, 'nxf_system_projects', { user_id: basicLogin.user.user_id }
    )
    const project = projectRows?.length ? projectRows[0] : null
    if (!project) return { success: false, error: 'No project found for user' }

    const now              = new Date()
    const expiresAt        = new Date(now.getTime() + 60 * 60 * 1000)           // 1 hour
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Generate cryptographically random tokens
    const accessToken  = crypto.randomUUID()
    const refreshToken = crypto.randomUUID()

    await this.create(config, 'nxf_system_tokens', {
      token_id:          crypto.randomUUID(),
      user_id:           basicLogin.user.user_id,
      project_id:        project.project_id,
      access_token:      accessToken,
      refresh_token:     refreshToken,
      token_type:        'bearer',
      expires_at:        expiresAt,
      refresh_expires_at: refreshExpiresAt,
      ip_address:        ipAddress || null,
      user_agent:        userAgent || null,
      revoked:           0,
      created_at:        now,
      updated_at:        now,
    })

    return {
      success:      true,
      user:         basicLogin.user,
      accessToken,
      refreshToken,
      projectId:    project.project_id,
    }
  }

  // -------------------------------------------------------------------------
  // Password reset
  // -------------------------------------------------------------------------

  /**
   * createPasswordResetToken
   *
   * Generates a secure password reset token and stores it on the user's record
   * with a 1-hour expiry. The token is returned so it can be included in the
   * reset email sent to the user.
   *
   * SECURITY: The token is returned to the caller (to be emailed) but never logged.
   *
   * @param email - The email address of the user requesting a reset.
   * @returns       The generated reset token string.
   * @throws If no user is found with that email.
   */
  async createPasswordResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    const [rows]: any = await this.pool.query(
      `SELECT user_id FROM nxf_users WHERE LOWER(user_email) = LOWER(?)`,
      [email]
    )
    if (!rows.length) throw new Error('User not found')

    await this.pool.query(
      `UPDATE nxf_users SET token=?, token_ttl=?, updated_at=? WHERE user_id=?`,
      [token, ttl, new Date(), rows[0].user_id]
    )

    return token
  }

  /**
   * findUserByToken
   *
   * Looks up a user by their password-reset or verification token,
   * only returning a result if the token has not yet expired.
   *
   * SECURITY: The token value is never logged — only the lookup result.
   *
   * @param token - The reset/verification token to look up.
   * @returns       The matching user row, or null if not found or expired.
   */
  async findUserByToken(token: string): Promise<any> {
    if (!token) return null

    const pool = await this.getPool(this.config)
    const now  = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const [rows]: any = await pool.query(
      `SELECT * FROM nxf_users WHERE token = ? AND token_ttl > ? LIMIT 1`,
      [token, now]
    )

    return rows?.[0] || null
  }

  /**
   * updatePasswordByToken
   *
   * Updates a user's password using a valid (non-expired) reset token,
   * then clears the token so it cannot be reused.
   *
   * Note: The `newPassword` received here is expected to already be hashed
   * by the calling route (see /api/auth/reset-password). The hash is stored
   * directly without re-hashing.
   *
   * SECURITY: The password hash and token are never logged.
   *
   * @param token       - The password reset token identifying the user.
   * @param newPassword - The new bcrypt-hashed password to store.
   * @returns             { success: true } on success.
   * @throws If the token is missing or is invalid/expired.
   */
  async updatePasswordByToken(
    token:       string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    if (!token) throw new Error('Token is required')

    const pool = await this.getPool(this.config)
    const now  = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // Find the user associated with this valid (non-expired) token
    const [rows]: any = await pool.query(
      `SELECT * FROM nxf_users WHERE token = ? AND token_ttl > ? LIMIT 1`,
      [token, now]
    )

    const user = rows?.[0]
    if (!user) throw new Error('Invalid or expired token')

    // Update the password hash and clear the reset token so it can't be reused
    await pool.query(
      `UPDATE nxf_users
       SET password_hash = ?,
           token         = NULL,
           token_ttl     = NULL,
           updated_at    = ?
       WHERE user_id = ?`,
      [newPassword, now, user.user_id]
    )

    return { success: true }
  }

  // -------------------------------------------------------------------------
  // Email verification
  // -------------------------------------------------------------------------

  /**
   * verifyEmail
   *
   * Marks a user's email address as verified using their verification token.
   * Clears the token after successful verification to prevent reuse.
   *
   * @param config - The database config.
   * @param data   - Object containing the verification token.
   * @returns       { success: true, message } on success.
   * @throws If token is missing, invalid, or expired.
   */
  async verifyEmail(
    config: DBConfig,
    data:   { token: string; email?: string }
  ): Promise<{ success: boolean; message?: string }> {
    const { token } = data
    if (!token) throw new Error('Verification token required')

    const pool = await this.getPool(config)
    const now  = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const [rows]: any = await pool.query(
      `SELECT * FROM nxf_users WHERE token = ? AND token_ttl > ? LIMIT 1`,
      [token, now]
    )

    const user = rows?.[0]
    if (!user) throw new Error('Invalid or expired verification token')

    await pool.query(
      `UPDATE nxf_users
       SET email_verified = 1,
           token          = NULL,
           token_ttl      = NULL,
           updated_at     = ?
       WHERE user_id = ?`,
      [now, user.user_id]
    )

    return { success: true, message: 'Email verified successfully' }
  }

  /**
   * resendVerificationEmail
   *
   * Generates a new verification token for a user who hasn't yet verified
   * their email, and stores it with a fresh 24-hour expiry.
   *
   * SECURITY: The new token is returned to the caller for emailing but never logged.
   *
   * @param config - The database config.
   * @param email  - The user's email address.
   * @returns       { success: true, token } with the new token.
   * @throws If the user is not found or email is already verified.
   */
  async resendVerificationEmail(
    config: DBConfig,
    email:  string
  ): Promise<{ success: boolean; token: string }> {
    const user = await this.findUserByEmail(config, email)
    if (!user)               throw new Error('User not found')
    if (user.email_verified) throw new Error('Email already verified')

    const newToken = crypto.randomBytes(32).toString('hex')
    const newTTL   = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await this.pool.query(
      `UPDATE nxf_users SET token=?, token_ttl=?, updated_at=? WHERE user_id=?`,
      [
        newToken,
        newTTL.toISOString().slice(0, 19).replace('T', ' '),
        new Date().toISOString().slice(0, 19).replace('T', ' '),
        user.user_id,
      ]
    )

    return { success: true, token: newToken }
  }

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  /**
   * registerUser
   *
   * Registers a new user account and creates their initial project.
   *
   * Steps:
   * 1. Checks no user already exists with that email.
   * 2. Hashes the password.
   * 3. Generates an email verification token (or uses the provided one).
   * 4. Creates the user record with `email_verified: 0`.
   * 5. Creates a project for the new user.
   * 6. Returns the user ID, project ID, and verification token.
   *
   * SECURITY: The raw password is hashed immediately and never stored or logged.
   *
   * @param config - The database config.
   * @param data   - { email, password, full_name?, token?, token_ttl? }
   * @returns       { success, user_id, project_id, token, token_ttl }
   * @throws If a user with that email already exists.
   */
  async registerUser(
    config: DBConfig,
    data: {
      email:      string
      password:   string
      full_name?: string
      token?:     string
      token_ttl?: string
    }
  ): Promise<any> {
    const { email, password, full_name, token, token_ttl } = data

    const existing = await this.findUserByEmail(config, email)
    if (existing) throw new Error('User already exists')

    const user_id       = crypto.randomUUID()
    const password_hash = await this.hashPassword(password)

    const emailToken = token     || crypto.randomBytes(32).toString('hex')
    const emailTTL   = token_ttl ? new Date(token_ttl) : new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.create(config, 'nxf_users', {
      user_id,
      user_email:     email,
      password_hash,
      full_name:      full_name || null,
      role:           'user',
      status:         'active',
      email_verified: 0,
      token:          emailToken,
      token_ttl:      emailTTL.toISOString(),
      created_at:     new Date(),
      updated_at:     new Date(),
    })

    const project_id = await this.createProject(config, {
      name:    `${full_name || email}'s Project`,
      user_id,
    })

    return {
      success:   true,
      user_id,
      project_id,
      token:     emailToken,
      token_ttl: emailTTL.toISOString(),
    }
  }

  // -------------------------------------------------------------------------
  // Session / token management
  // -------------------------------------------------------------------------

  /**
   * findTokenByAccessToken
   *
   * Looks up a session token record by its access token value.
   *
   * @param accessToken - The access token string to look up.
   * @returns             The token row, or null if not found.
   */
  async findTokenByAccessToken(accessToken: string): Promise<any> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM nxf_system_tokens WHERE access_token=?`,
      [accessToken]
    )
    return rows[0] || null
  }

  /**
   * findTokenByRefreshToken
   *
   * Looks up a session token record by its refresh token value.
   *
   * @param refreshToken - The refresh token string to look up.
   * @returns              The token row, or null if not found.
   */
  async findTokenByRefreshToken(refreshToken: string): Promise<any> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM nxf_system_tokens WHERE refresh_token=?`,
      [refreshToken]
    )
    return rows[0] || null
  }

  /**
   * extendToken
   *
   * Updates an existing session token record with new data (e.g. new expiry).
   * Used to extend a session without creating a new token.
   *
   * @param tokenId - The `token_id` of the record to update.
   * @param data    - Key-value pairs of fields to update on the token record.
   * @returns        True on success.
   */
  async extendToken(tokenId: string, data: any): Promise<boolean> {
    await this.pool.query(
      `UPDATE nxf_system_tokens SET ? WHERE token_id=?`,
      [data, tokenId]
    )
    return true
  }

  // -------------------------------------------------------------------------
  // Projects and tenants
  // -------------------------------------------------------------------------

  /**
   * createProject
   *
   * Creates a new project record in `nxf_system_projects` and returns its ID.
   *
   * @param config - The database config.
   * @param data   - { name, user_id }
   * @returns       The generated project_id UUID string.
   */
  async createProject(
    config: DBConfig,
    data: { name: string; user_id: string }
  ): Promise<string> {
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
   * Looks up the first project associated with the given user ID.
   *
   * @param config   - The database config.
   * @param ownerId  - The user_id to look up projects for.
   * @returns         The project row, or null if none found.
   */
  async findProjectByOwnerId(config: DBConfig, ownerId: string): Promise<any> {
    const rows: any = await this.read(config, 'nxf_system_projects', { user_id: ownerId })
    return rows?.[0] || null
  }

  /**
   * createTenant
   *
   * Creates a new tenant record in `nxf_system_tenants` and returns its ID.
   * Tenants are used in multi-tenant deployments to isolate each customer.
   *
   * @param config - The database config.
   * @param data   - { subdomain, user_email }
   * @returns       The generated ten_id UUID string.
   */
  async createTenant(
    config: DBConfig,
    data: { subdomain: string; user_email: string }
  ): Promise<string> {
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
   * Looks up the first tenant associated with the given email address.
   *
   * @param config - The database config.
   * @param email  - The user email to look up.
   * @returns       The tenant row, or null if none found.
   */
  async findTenantByUserEmail(config: DBConfig, email: string): Promise<any> {
    const rows: any = await this.read(config, 'nxf_system_tenants', { user_email: email })
    return rows?.[0] || null
  }

  /**
   * saveInstallerConfig
   *
   * Saves the complete installer configuration to `nxf_system_config` and
   * returns the generated config ID.
   *
   * @param config - The database config.
   * @param data   - The full installer config object to store.
   * @returns       The generated config_id UUID string.
   */
  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    const config_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_config', {
      config_id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return config_id
  }

  // -------------------------------------------------------------------------
  // Storage
  // -------------------------------------------------------------------------

  /**
   * setupStorageBuckets
   *
   * Creates default storage bucket entries in `nxf_storage` for each folder
   * in `DEFAULT_BUCKETS`. Skips folders that already have a record.
   *
   * @returns { success: true, buckets: string[] }
   */
  async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
    for (const folder of this.DEFAULT_BUCKETS) {
      const existing = await this.read(this.config, 'nxf_storage', { folder })
      if (!existing || !existing.length) {
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
   * Creates a single custom storage bucket entry in `nxf_storage`.
   *
   * @param folder - The folder/bucket name to create.
   * @returns       The mysql2 insert result.
   */
  async createBucket(folder: string): Promise<any> {
    return this.create(this.config, 'nxf_storage', {
      storage_id: crypto.randomUUID(),
      folder,
      file_name:  '',
      file_path:  folder,
      created_at: new Date(),
    })
  }

  // -------------------------------------------------------------------------
  // Demo content
  // -------------------------------------------------------------------------

  /**
   * installDemoContent
   *
   * Reads JSON demo data files from the file system and inserts them into
   * the database. Called during the installer to pre-populate the database
   * with sample content for the selected project type.
   *
   * Folder resolution:
   * - Looks in three folders relative to `../demo_content/`:
   *   1. `<selectedProjectType>_models/` — project-type-specific demo data
   *   2. `system_models/`                — shared system table demo data
   *   3. `users_models/`                 — demo user data
   *
   * File format:
   * - Each `.json` file name corresponds to a table name.
   * - File contents can be either a plain array `[...]` or an object
   *   with a `demo_data` array: `{ "demo_data": [...] }`.
   *
   * Error handling:
   * - Folders that don't exist are silently skipped.
   * - Files with invalid JSON return early with an error result.
   * - Individual row insert failures are logged and skipped (not fatal).
   *
   * @param config              - The database config.
   * @param selectedProjectType - The project template type (e.g. 'ecommerce').
   * @returns                    { success, inserted, skipped, error? }
   */
  async installDemoContent(
    config:               DBConfig,
    selectedProjectType:  string
  ): Promise<{ success: boolean; error?: string; inserted?: number; skipped?: boolean }> {
    try {
      const fs   = require('fs')
      const path = require('path')

      // The three folders to look for demo JSON files in
      const modelFolders = [
        `${selectedProjectType}_models`,
        'system_models',
        'users_models',
      ]

      const basePaths = modelFolders.map((folder) =>
        path.resolve(process.cwd(), '..', 'demo_content', folder)
      )

      console.log('[mysql-adapter] installDemoContent: Starting demo content installation')
      console.log('[mysql-adapter] installDemoContent: Checking folders:', modelFolders)

      let inserted = 0

      for (const basePath of basePaths) {

        // Skip folders that don't exist on the file system
        if (!fs.existsSync(basePath)) {
          console.log('[mysql-adapter] installDemoContent: Folder not found, skipping:', basePath)
          continue
        }

        // Get all .json files in this folder
        const files: string[] = fs
          .readdirSync(basePath)
          .filter((f: string) => f.endsWith('.json'))

        if (!files.length) {
          console.log('[mysql-adapter] installDemoContent: No JSON files found in folder:', basePath)
          continue
        }

        for (const file of files) {
          const fullPath = path.join(basePath, file)
          const raw      = fs.readFileSync(fullPath, 'utf-8')

          let json: any
          try {
            json = JSON.parse(raw)
          } catch (e: any) {
            // Invalid JSON is a hard failure — return immediately
            return {
              success: false,
              error:   `Invalid JSON in file ${file}: ${e.message}`,
              skipped: true,
            }
          }

          // Table name is derived from the file name (without extension)
          const tableName = file.replace('.json', '')

          // Support both array format and { demo_data: [...] } format
          const rows = Array.isArray(json) ? json : json?.demo_data

          if (!rows || !Array.isArray(rows)) {
            console.log(`[mysql-adapter] installDemoContent: Skipping ${file} — no insertable array found`)
            continue
          }

          console.log(`[mysql-adapter] installDemoContent: Inserting ${rows.length} rows into ${tableName}`)

          for (const row of rows) {
            try {
              await this.create(config, tableName, row)
              inserted++
            } catch (err: any) {
              // Log individual row failures but continue with the rest
              console.warn(`[mysql-adapter] installDemoContent: Failed to insert row into ${tableName}:`, err.message)
            }
          }
        }
      }

      console.log(`[mysql-adapter] installDemoContent: Completed — ${inserted} rows inserted`)

      return { success: true, inserted, skipped: false }

    } catch (err: any) {
      console.error('[mysql-adapter] installDemoContent: Unexpected error:', err.message)
      return {
        success:  false,
        inserted: 0,
        skipped:  true,
        error:    err?.message || 'Failed to install demo content',
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * getMySQLAdapter
 *
 * A convenience factory function that creates and returns a new MySQLAdapter
 * instance for the provided config.
 *
 * Use this instead of `new MySQLAdapter(config)` when you want a clean,
 * one-line way to get an adapter instance.
 *
 * @param config - The database connection configuration.
 * @returns       A new MySQLAdapter instance.
 */
export function getMySQLAdapter(config: DBConfig): MySQLAdapter {
  return new MySQLAdapter(config)
}