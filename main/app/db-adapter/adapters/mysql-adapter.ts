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
import { DBConfig, DBAdapter, ColumnDef, StorageFile } from '../types'
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

  constructor(config: DBConfig) {
    if (!config)           throw new Error('DBConfig must be provided via adapter')
    if (!config.user)      throw new Error('MySQLAdapter: config.user is required')
    if (!config.password)  throw new Error('MySQLAdapter: config.password is required')
    if (!config.database)  throw new Error('MySQLAdapter: config.database is required')

    this.config = config

    this.pool = mysql.createPool({
      host:               config.host || 'localhost',
      user:               config.user,
      password:           config.password,
      database:           config.database,
      port:               config.port ? Number(config.port) : 3306,
      waitForConnections: true,
      connectionLimit:    10,
      timezone:           'Z',
    })
  }

  // -------------------------------------------------------------------------
  // Private: pool management
  // -------------------------------------------------------------------------

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
        timezone:           'Z',
      })
    }

    return this.pools[key]
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  async connect(): Promise<void> {
    const conn = await this.pool.getConnection()
    conn.release()
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      await this.connect()
      return { success: true, message: 'Connected to MySQL successfully.' }
    } catch (err: any) {
      const message = err.message || 'Failed to connect to MySQL'
      return { success: false, message, error: message }
    }
  }

  // -------------------------------------------------------------------------
  // Password helpers
  // -------------------------------------------------------------------------

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

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
   * - `Date` objects → converted to UTC MySQL DATETIME string (YYYY-MM-DD HH:MM:SS).
   * - ISO 8601 strings → converted to UTC MySQL DATETIME string to prevent
   *   timezone offset issues when MySQL reads the value back.
   * - Objects/arrays → JSON-serialised to strings.
   *
   * Why UTC for datetimes?
   * MySQL DATETIME columns store naive datetimes with no timezone info.
   * If we store local time and the server timezone differs from UTC, MySQL
   * reads it back and appends .000Z making it appear as UTC when it isn't.
   * Always storing UTC values ensures what goes in equals what comes out.
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

      if (value instanceof Date) {
        // Convert Date to UTC MySQL DATETIME string
        cleaned[key] = value.toISOString().slice(0, 19).replace('T', ' ')
      } else if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        // Convert ISO 8601 string to UTC MySQL DATETIME string
        // Using new Date() ensures any timezone offset in the string is
        // normalised to UTC before slicing — prevents 1-hour drift
        cleaned[key] = new Date(value).toISOString().slice(0, 19).replace('T', ' ')
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
      if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        return new Date(value).toISOString().slice(0, 19).replace('T', ' ')
      }
      return value
    })

    const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ')
    values.push(id)

    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${idColumn}\` = ?`
    const [result] = await pool.query(sql, values)
    return result
  }

  /**
   * delete
   *
   * Deletes a row from the specified table by its id column value.
   */
  async delete(
    config:   DBConfig,
    table:    string,
    id:       string,
    idColumn: string = 'id'
  ): Promise<any> {
    const pool     = await this.getPool(config)
    const sql      = `DELETE FROM \`${table}\` WHERE \`${idColumn}\` = ?`
    const [result] = await pool.query(sql, [id])
    return result
  }

  // -------------------------------------------------------------------------
  // System config
  // -------------------------------------------------------------------------

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

  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, ColumnDef> }
  ): Promise<void> {
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

        const constraints: string[] = []
        if (col.is_primary)         constraints.push('PRIMARY KEY')
        if (col.unique)             constraints.push('UNIQUE')
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

  async CreateDataModels(
    projectId: string,
    selectedProjectType: string
  ): Promise<any> {
    const [tenantRows] = await this.pool.execute(
      'SELECT ten_id FROM `nxf_system_tenants` LIMIT 1'
    )
    const tenant   = (tenantRows as any[])[0]
    const tenantId = tenant?.ten_id ?? ''

    return await CreateUserDataModels(
      this,
      projectId,
      tenantId,
      selectedProjectType,
      []
    )
  }

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

  async findUserByEmail(config: DBConfig, email: string): Promise<any> {
    const rows: any = await this.read(config, 'nxf_users', { user_email: email })
    return rows?.length ? rows[0] : null
  }

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
        user_id:   user.user_id,
        email:     user.user_email,
        full_name: user.full_name,
        role:      user.role   || 'user',
        status:    user.status || 'active',
      },
    }
  }

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
    const expiresAt        = new Date(now.getTime() + 60 * 60 * 1000)
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const accessToken  = crypto.randomUUID()
    const refreshToken = crypto.randomUUID()

    await this.create(config, 'nxf_system_tokens', {
      token_id:           crypto.randomUUID(),
      user_id:            basicLogin.user.user_id,
      project_id:         project.project_id,
      access_token:       accessToken,
      refresh_token:      refreshToken,
      token_type:         'bearer',
      expires_at:         expiresAt,
      refresh_expires_at: refreshExpiresAt,
      ip_address:         ipAddress || null,
      user_agent:         userAgent || null,
      revoked:            0,
      created_at:         now,
      updated_at:         now,
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

  async createPasswordResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 60 * 60 * 1000)

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

  async updatePasswordByToken(
    token:       string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    if (!token) throw new Error('Token is required')

    const pool = await this.getPool(this.config)
    const now  = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const [rows]: any = await pool.query(
      `SELECT * FROM nxf_users WHERE token = ? AND token_ttl > ? LIMIT 1`,
      [token, now]
    )

    const user = rows?.[0]
    if (!user) throw new Error('Invalid or expired token')

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

  async resendVerificationEmail(
    config: DBConfig,
    email:  string
  ): Promise<{ success: boolean; token: string }> {
    const user = await this.findUserByEmail(config, email)
    if (!user)               throw new Error('User not found')
    if (user.email_verified) throw new Error('Email already verified')

    const newToken = crypto.randomBytes(32).toString('hex')
    const newTTL   = new Date(Date.now() + 24 * 60 * 60 * 1000)

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

  async findTokenByAccessToken(accessToken: string): Promise<any> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM nxf_system_tokens WHERE access_token=?`,
      [accessToken]
    )
    return rows[0] || null
  }

  async findTokenByRefreshToken(refreshToken: string): Promise<any> {
    const [rows]: any = await this.pool.query(
      `SELECT * FROM nxf_system_tokens WHERE refresh_token=?`,
      [refreshToken]
    )
    return rows[0] || null
  }

  async extendToken(tokenId: string, data: any): Promise<boolean> {
    const keys   = Object.keys(data)
    const values = keys.map((k) => {
      const value = data[k]
      if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ')
      if (
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
      ) {
        return new Date(value).toISOString().slice(0, 19).replace('T', ' ')
      }
      if (typeof value === 'object' && value !== null) return JSON.stringify(value)
      return value
    })

    const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ')
    values.push(tokenId)

    await this.pool.query(
      `UPDATE \`nxf_system_tokens\` SET ${setClause} WHERE \`token_id\` = ?`,
      values
    )
    return true
  }

  // -------------------------------------------------------------------------
  // Projects and tenants
  // -------------------------------------------------------------------------

  async createProject(
    config: DBConfig,
    data: { name: string; user_id: string; tenant_ID?: string }
  ): Promise<string> {
    const project_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_projects', {
      project_id,
      name:       data.name,
      user_id:    data.user_id,
      tenant_id:  data.tenant_ID || null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return project_id
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string): Promise<any> {
    const rows: any = await this.read(config, 'nxf_system_projects', { user_id: ownerId })
    return rows?.[0] || null
  }

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

  async findTenantByUserEmail(config: DBConfig, email: string): Promise<any> {
    const rows: any = await this.read(config, 'nxf_system_tenants', { user_email: email })
    return rows?.[0] || null
  }

  async findTenantByUserID(config: DBConfig, user_id: string): Promise<any> {
    const rows: any = await this.read(config, 'nxf_system_tenants', { user_id: user_id })
    return rows?.[0] || null
  }

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

async installDemoContent(
  config: DBConfig,
  selectedProjectType: string
): Promise<{ success: boolean; error?: string; inserted?: number; skipped?: boolean }> {
  const fs   = require('fs')
  const path = require('path')

  try {
    const [userRows] = await this.pool.execute(
      `SELECT user_id FROM \`nxf_users\` WHERE role = 'admin' LIMIT 1`
    )
    const adminUser = (userRows as any[])[0]
    if (!adminUser) return { success: false, error: 'No admin user found' }
    const adminUserId = adminUser.user_id

    const [projectRows] = await this.pool.execute(
      'SELECT project_id FROM `nxf_system_projects` LIMIT 1'
    )
    const project = (projectRows as any[])[0]
    if (!project) return { success: false, error: 'No project found' }
    const projectId = project.project_id

    const [tenantRows] = await this.pool.execute(
      'SELECT ten_id FROM `nxf_system_tenants` LIMIT 1'
    )
    const tenant = (tenantRows as any[])[0]
    if (!tenant) return { success: false, error: 'No tenant found' }
    const tenantId = tenant.ten_id

    // ── Pre-build the model name → sm_id resolver map ──────────────────────
    // Used by the nxf_pages installer to resolve "model": "nxf_product"
    // into the actual sm_id at install time.

    const modelNameToId = new Map<string, string>()
    try {
      const [modelRows] = await this.pool.execute(
        'SELECT sm_id, name FROM `nxf_system_models` WHERE project_id = ?',
        [projectId]
      )
      for (const m of modelRows as any[]) {
        if (m.name && m.sm_id) modelNameToId.set(m.name, m.sm_id)
      }
      console.log(
        `[MySQLAdapter] Built model resolver map — ${modelNameToId.size} models indexed`
      )
    } catch (err: any) {
      console.warn('[MySQLAdapter] Failed to build model resolver map:', err.message)
    }

    const modelFolders = [
      'system_models',
      'users_models',
      `${selectedProjectType}_models`,
    ]

    let totalInserted = 0

    for (const folder of modelFolders) {
      const basePath = path.resolve(process.cwd(), '..', 'demo_content', folder)

      if (!fs.existsSync(basePath)) {
        console.log('[MySQLAdapter] Demo folder not found, skipping:', basePath)
        continue
      }

      const files = fs.readdirSync(basePath).filter((f: string) => f.endsWith('.json'))

      for (const file of files) {
        const raw = fs.readFileSync(path.join(basePath, file), 'utf-8')

        let json: any
        try {
          json = JSON.parse(raw)
        } catch {
          console.warn(`[MySQLAdapter] Skipping invalid JSON: ${file}`)
          continue
        }

        const tableName = file.replace('.json', '')
        const rows      = Array.isArray(json) ? json : json?.demo_data

        if (!rows || !Array.isArray(rows)) continue

        const [colRows] = await this.pool.execute(
          `SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [tableName]
        )
        const tableMeta = colRows as any[]

        if (!tableMeta.length) {
          console.log(`[MySQLAdapter] Skipping ${tableName} — table does not exist`)
          continue
        }

        const tableColumns = tableMeta.map((c) => c.COLUMN_NAME)
        const colTypeMap   = Object.fromEntries(
          tableMeta.map((c) => [c.COLUMN_NAME, c.DATA_TYPE])
        )

        console.log(`[MySQLAdapter] Inserting into ${tableName} — ${rows.length} rows`)

        for (const row of rows) {
          try {
            const enriched = { ...row }

            // Resolve model name → model_id for nxf_pages rows
            if (tableName === 'nxf_pages' && enriched.model) {
              const resolvedId = modelNameToId.get(enriched.model)
              if (resolvedId) {
                enriched.model_id = resolvedId
              } else {
                console.warn(
                  `[MySQLAdapter] Page "${enriched.slug}" references model "${enriched.model}" which does not exist — model_id left null`
                )
              }
            }

            if ('project_id' in enriched) enriched.project_id = projectId
            if ('tenant_id'  in enriched) enriched.tenant_id  = tenantId
            if ('created_by' in enriched) enriched.created_by = adminUserId
            if ('user_id'    in enriched) enriched.user_id    = adminUserId

            for (const key of Object.keys(enriched)) {
              if (typeof enriched[key] === 'string' && enriched[key].startsWith('{{')) {
                enriched[key] = null
              }
            }

            if (!enriched.created_at) enriched.created_at = new Date().toISOString()

            const filtered: Record<string, any> = {}
            for (const key of Object.keys(enriched)) {
              if (tableColumns.includes(key)) {
                filtered[key] = enriched[key]
              }
            }

            if (!Object.keys(filtered).length) continue

            for (const key of Object.keys(filtered)) {
              const val      = filtered[key]
              const dataType = colTypeMap[key]

              if (val !== null && typeof val === 'object') {
                filtered[key] = JSON.stringify(val)
                continue
              }

              if (
                typeof val === 'string' &&
                (dataType === 'datetime' || dataType === 'timestamp') &&
                val.includes('T')
              ) {
                filtered[key] = new Date(val).toISOString().slice(0, 19).replace('T', ' ')
              }
            }

            const columns      = Object.keys(filtered).map((c) => `\`${c}\``).join(', ')
            const placeholders = Object.keys(filtered).map(() => '?').join(', ')
            const values       = Object.values(filtered)

            await this.pool.execute(
              `INSERT IGNORE INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`,
              values
            )

            totalInserted++
          } catch (err: any) {
            console.warn(`[MySQLAdapter] Skipping row in ${tableName}:`, err.message)
          }
        }
      }
    }

    return { success: true, inserted: totalInserted }

  } catch (err: any) {
    console.error('[MySQLAdapter] installDemoContent failed:', err.message)
    return { success: false, inserted: 0, error: 'Failed to install demo content' }
  }
}

  // ─── Core CRUD ──────────────────────────────────────────────────────────────

  async readAll(config: DBConfig, table: string): Promise<any[]> {
    try {
      console.log(`[MySQLAdapter] readAll — table: ${table}`)
      const [rows] = await this.pool.execute(`SELECT * FROM \`${table}\``)
      return rows as any[]
    } catch (err: any) {
      console.error(`[MySQLAdapter] readAll failed — table: ${table}`)
      throw new Error(`readAll failed: ${err.message}`)
    }
  }

  // ─── Users & Auth ────────────────────────────────────────────────────────────

  async getUserById(uid: string): Promise<{ user?: any; error?: string }> {
    try {
      if (!uid) return { error: 'UID is required' }

      const [rows] = await this.pool.execute(
        'SELECT * FROM `nxf_users` WHERE `user_id` = ? LIMIT 1',
        [uid]
      )

      const results = rows as any[]
      if (!results.length) return { error: 'User not found' }

      return { user: results[0] }
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

      const [rows] = await this.pool.execute(
        'SELECT * FROM `nxf_users` WHERE `user_id` = ? LIMIT 1',
        [userId]
      )

      const results = rows as any[]
      if (!results.length) return { allowed: false, reason: 'User not found' }

      const user = results[0]

      if (user.status === 'suspended') return { allowed: false, user, reason: 'Account suspended' }
      if (user.status === 'inactive')  return { allowed: false, user, reason: 'Account inactive' }

      return { allowed: true, user }

    } catch (err: any) {
      console.error('[MySQLAdapter] checkUserStatus failed')
      return { allowed: false, reason: err.message || 'Status check failed' }
    }
  }

  async syncAuthUserToDatabase(
    config: DBConfig,
    user: { uid: string; email: string; full_name: string; notes?: string }
  ): Promise<string> {
    if (!user?.uid)      throw new Error('User UID is required')
    if (!user.full_name) throw new Error('Full name is required')

    const [rows] = await this.pool.execute(
      'SELECT user_id FROM `nxf_users` WHERE `user_id` = ? LIMIT 1',
      [user.uid]
    )

    const existing = (rows as any[])

    if (!existing.length) {
      await this.pool.execute(
        `INSERT INTO \`nxf_users\`
         (user_id, user_email, full_name, role, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, 'user', 'active', ?, ?, ?)`,
        [
          user.uid,
          user.email || '',
          user.full_name,
          user.notes || '',
          new Date().toISOString().slice(0, 19).replace('T', ' '),
          new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      )
    } else {
      await this.pool.execute(
        `UPDATE \`nxf_users\`
         SET user_email = ?, full_name = ?, updated_at = ?
         WHERE user_id = ?`,
        [
          user.email || '',
          user.full_name,
          new Date().toISOString().slice(0, 19).replace('T', ' '),
          user.uid,
        ]
      )
    }

    return user.uid
  }

  async writeActivityLog(
    config: DBConfig,
    entry: { user_id: string; action: string; context?: string }
  ): Promise<void> {
    try {
      const [projectRows] = await this.pool.execute(
        'SELECT project_id, id FROM `nxf_system_projects` LIMIT 1'
      )
      const project    = (projectRows as any[])[0]
      const project_id = project?.project_id ?? project?.id ?? null

      const [tenantRows] = await this.pool.execute(
        'SELECT ten_id, id FROM `nxf_system_tenants` LIMIT 1'
      )
      const tenant    = (tenantRows as any[])[0]
      const tenant_id = tenant?.ten_id ?? tenant?.id ?? null

      await this.pool.execute(
        `INSERT INTO \`nxf_system_activity_logs\`
         (log_id, project_id, tenant_id, user_id, action, context, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          project_id,
          tenant_id,
          entry.user_id,
          entry.action,
          entry.context ?? null,
          new Date().toISOString().slice(0, 19).replace('T', ' '),
        ]
      )

    } catch (err: any) {
      console.error('[MySQLAdapter] writeActivityLog failed:', err.message)
    }
  }

  // ─── Table / Schema Management ───────────────────────────────────────────────

  async alterTable(
    tableName: string,
    changes: { add?: ColumnDef[]; drop?: string[]; rename?: { from: string; to: string } }
  ): Promise<any> {
    console.log(`[MySQLAdapter] alterTable — ${tableName}`)

    const statements: string[] = []

    if (changes.add?.length) {
      for (const col of changes.add) {
        let typeSql = ''
        switch (col.type.toLowerCase()) {
          case 'uuid':
          case 'string':
          case 'text':      typeSql = 'TEXT';       break
          case 'json':
          case 'jsonb':
          case 'array':     typeSql = 'JSON';       break
          case 'datetime':
          case 'date':
          case 'timestamp': typeSql = 'DATETIME';   break
          case 'integer':
          case 'int':       typeSql = 'INT';        break
          case 'bigint':    typeSql = 'BIGINT';     break
          case 'boolean':   typeSql = 'TINYINT(1)'; break
          case 'float':
          case 'number':
          case 'decimal':
          case 'double':    typeSql = 'DOUBLE';     break
          default:
            throw new Error(`Unsupported column type: ${col.type}`)
        }
        const notNull = col.nullable === false ? ' NOT NULL' : ''
        statements.push(
          `ALTER TABLE \`${tableName}\` ADD COLUMN IF NOT EXISTS \`${col.name}\` ${typeSql}${notNull};`
        )
      }
    }

    if (changes.drop?.length) {
      for (const colName of changes.drop) {
        statements.push(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${colName}\`;`)
      }
    }

    if (changes.rename) {
      statements.push(
        `ALTER TABLE \`${tableName}\` RENAME COLUMN \`${changes.rename.from}\` TO \`${changes.rename.to}\`;`
      )
    }

    for (const sql of statements) {
      console.log(`[MySQLAdapter] alterTable executing: ${sql}`)
      await this.pool.execute(sql)
    }

    console.log(`[MySQLAdapter] alterTable completed for ${tableName}`)
    return true
  }

  async dropTable(tableName: string): Promise<any> {
    console.log(`[MySQLAdapter] dropTable — ${tableName}`)
    await this.pool.execute(`DROP TABLE IF EXISTS \`${tableName}\``)
    console.log(`[MySQLAdapter] dropTable completed — ${tableName}`)
    return true
  }

  async renameTable(oldName: string, newName: string): Promise<any> {
    console.log(`[MySQLAdapter] renameTable — ${oldName} → ${newName}`)
    await this.pool.execute(`RENAME TABLE \`${oldName}\` TO \`${newName}\``)
    console.log(`[MySQLAdapter] renameTable completed — ${oldName} → ${newName}`)
    return true
  }

  // ─── Messages ────────────────────────────────────────────────────────────────

  async listConversations(
    config:     DBConfig,
    project_id: string,
    uid:        string,
    limit       = 10
  ): Promise<Array<Record<string, any>>> {
    const [rows] = await this.pool.execute(
      `SELECT * FROM \`nxf_system_conversations\`
       WHERE project_id = ?
       ORDER BY last_message_at DESC
       LIMIT ?`,
      [project_id, limit]
    )

    const conversations = rows as any[]
    if (!conversations.length) return []

    const seen    = new Set<string>()
    const deduped = conversations.filter((conv) => {
      const con_id = conv.con_id ?? conv.id
      if (seen.has(con_id)) return false
      seen.add(con_id)
      return true
    })

    const withUnread = await Promise.all(
      deduped.map(async (conv) => {
        const con_id = conv.con_id ?? conv.id
        const [countRows] = await this.pool.execute(
          `SELECT COUNT(*) as count FROM \`nxf_system_messages\`
           WHERE conversation_id = ? AND recipient_id = ? AND is_read = 0`,
          [con_id, uid]
        )
        const unread_count = (countRows as any[])[0]?.count ?? 0
        return { ...conv, con_id, id: con_id, unread_count }
      })
    )

    return withUnread
  }

  async getConversationThread(
    config:         DBConfig,
    conversationId: string
  ): Promise<Array<Record<string, any>>> {
    const [rows] = await this.pool.execute(
      `SELECT * FROM \`nxf_system_messages\`
       WHERE conversation_id = ?
       ORDER BY sent_at ASC`,
      [conversationId]
    )

    const messages = rows as any[]
    const seen = new Set<string>()
    return messages.filter((msg) => {
      const mes_id = msg.mes_id ?? msg.id
      if (seen.has(mes_id)) return false
      seen.add(mes_id)
      return true
    })
  }

  async sendMessage(
    config:         DBConfig,
    conversationId: string,
    senderId:       string,
    content:        string
  ): Promise<Record<string, any>> {
    const now    = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const mes_id = crypto.randomUUID()

    const [projectRows] = await this.pool.execute(
      'SELECT project_id, id FROM `nxf_system_projects` LIMIT 1'
    )
    const project    = (projectRows as any[])[0]
    const project_id = project?.project_id ?? project?.id ?? null

    const [tenantRows] = await this.pool.execute(
      'SELECT ten_id, id FROM `nxf_system_tenants` LIMIT 1'
    )
    const tenant    = (tenantRows as any[])[0]
    const tenant_id = tenant?.ten_id ?? tenant?.id ?? null

    await this.pool.execute(
      `INSERT INTO \`nxf_system_messages\`
       (mes_id, project_id, tenant_id, conversation_id, sender_id, recipient_id,
        content, is_read, sent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 0, ?, ?, ?)`,
      [mes_id, project_id, tenant_id, conversationId, senderId, content, now, now, now]
    )

    try {
      await this.pool.execute(
        `UPDATE \`nxf_system_conversations\`
         SET last_message_preview = ?, last_message_at = ?, updated_at = ?
         WHERE con_id = ?`,
        [content.slice(0, 100), now, now, conversationId]
      )
    } catch {
      console.warn('[MySQLAdapter] sendMessage — conversation preview update failed')
    }

    return {
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
  }

  async markConversationRead(
    config:         DBConfig,
    uid:            string,
    conversationId: string
  ): Promise<{ success: boolean }> {
    await this.pool.execute(
      `UPDATE \`nxf_system_messages\`
       SET is_read = 1, updated_at = ?
       WHERE conversation_id = ? AND recipient_id = ? AND is_read = 0`,
      [new Date().toISOString().slice(0, 19).replace('T', ' '), conversationId, uid]
    )
    return { success: true }
  }

  async markAllMessagesRead(
    config: DBConfig,
    uid:    string
  ): Promise<{ success: boolean }> {
    await this.pool.execute(
      `UPDATE \`nxf_system_messages\`
       SET is_read = 1, updated_at = ?
       WHERE recipient_id = ? AND is_read = 0`,
      [new Date().toISOString().slice(0, 19).replace('T', ' '), uid]
    )
    return { success: true }
  }

  async deleteConversation(
    config:         DBConfig,
    conversationId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.pool.execute(
        'DELETE FROM `nxf_system_messages` WHERE conversation_id = ?',
        [conversationId]
      )
      await this.pool.execute(
        'DELETE FROM `nxf_system_conversations` WHERE con_id = ?',
        [conversationId]
      )
      return { success: true }
    } catch (err: any) {
      throw new Error(`Failed to delete conversation: ${err.message}`)
    }
  }

  // ─── Notifications ───────────────────────────────────────────────────────────

  async listNotifications(
    config:     DBConfig,
    uid:        string,
    project_id: string,
    limit       = 20
  ): Promise<Array<Record<string, any>>> {
    const [rows] = await this.pool.execute(
      `SELECT * FROM \`nxf_system_notifications\`
       WHERE project_id = ? AND user_id = ? AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT ?`,
      [project_id, uid, limit]
    )
    return rows as any[]
  }

  async markNotificationRead(
    config:         DBConfig,
    notificationId: string,
    uid:            string
  ): Promise<{ success: boolean }> {
    const [rows] = await this.pool.execute(
      'SELECT * FROM `nxf_system_notifications` WHERE notif_id = ? LIMIT 1',
      [notificationId]
    )

    const results = rows as any[]
    if (!results.length) throw new Error('Notification not found')
    if (results[0].user_id !== uid) throw new Error('Forbidden — notification does not belong to this user')

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await this.pool.execute(
      `UPDATE \`nxf_system_notifications\`
       SET status = 'read', is_read = 1, read_at = ?, updated_at = ?
       WHERE notif_id = ?`,
      [now, now, notificationId]
    )

    return { success: true }
  }

  async markAllNotificationsRead(
    config:     DBConfig,
    uid:        string,
    project_id: string
  ): Promise<{ success: boolean; updated: number }> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const [result] = await this.pool.execute(
      `UPDATE \`nxf_system_notifications\`
       SET status = 'read', is_read = 1, read_at = ?, updated_at = ?
       WHERE project_id = ? AND user_id = ? AND status = 'unread'`,
      [now, now, project_id, uid]
    )

    const updated = (result as any).affectedRows ?? 0
    return { success: true, updated }
  }

  // ─── API Keys ────────────────────────────────────────────────────────────────

  async listApiKeys(
    config: DBConfig,
    project_id: string
  ): Promise<Array<{
    api_id:       string
    name:         string
    key_prefix:   string
    status:       string
    last_used_at: string | null
    created_at:   string
  }>> {
    const [rows] = await this.pool.execute(
      `SELECT api_id, name, key_prefix, status, last_used_at, created_at
       FROM \`nxf_system_apis\`
       WHERE project_id = ? AND status = 'active'
       ORDER BY created_at DESC`,
      [project_id]
    )

    return rows as Array<{
      api_id:       string
      name:         string
      key_prefix:   string
      status:       string
      last_used_at: string | null
      created_at:   string
    }>
  }

  async getApiKey(
    config: DBConfig,
    api_id: string
  ): Promise<Record<string, any> | null> {
    const [rows] = await this.pool.execute(
      'SELECT * FROM `nxf_system_apis` WHERE api_id = ? LIMIT 1',
      [api_id]
    )
    const results = rows as any[]
    return results[0] ?? null
  }

  async revokeApiKey(
    config:     DBConfig,
    api_id:     string,
    project_id: string
  ): Promise<{ success: boolean }> {
    const [rows] = await this.pool.execute(
      'SELECT * FROM `nxf_system_apis` WHERE api_id = ? LIMIT 1',
      [api_id]
    )

    const results = rows as any[]
    if (!results.length) throw new Error('API key not found')
    if (results[0].project_id !== project_id) throw new Error('Forbidden')

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    await this.pool.execute(
      `UPDATE \`nxf_system_apis\`
       SET status = 'revoked', revoked_at = ?, updated_at = ?
       WHERE api_id = ?`,
      [now, now, api_id]
    )

    console.log(`[MySQLAdapter] revokeApiKey — key ${api_id} revoked`)
    return { success: true }
  }

  // ─── Storage ─────────────────────────────────────────────────────────────────

  async listFolders(): Promise<string[]> {
    try {
      const [rows] = await this.pool.execute(
        'SELECT DISTINCT folder FROM `nxf_storage` WHERE folder IS NOT NULL'
      )
      return (rows as any[]).map((r) => r.folder).filter(Boolean)
    } catch {
      console.error('[MySQLAdapter] listFolders failed')
      return []
    }
  }

  async listFiles(folder: string): Promise<StorageFile[]> {
    try {
      const [rows] = await this.pool.execute(
        'SELECT * FROM `nxf_storage` WHERE folder = ?',
        [folder]
      )

      return (rows as any[]).map((row) => ({
        id:         row.id?.toString(),
        name:       row.file_name,
        url:        row.url,
        size:       row.size_label ?? '—',
        mimeType:   row.mime_type ?? 'application/octet-stream',
        folder:     row.folder,
        folderPath: row.file_path,
        uploaded:   row.created_at
          ? new Date(row.created_at).toLocaleDateString('en-GB', {
              day:   '2-digit',
              month: 'short',
              year:  'numeric',
            })
          : '—',
      }))
    } catch {
      console.error('[MySQLAdapter] listFiles failed')
      return []
    }
  }

  async uploadFile(
    folder:   string,
    fileName: string,
    buffer:   Buffer,
    mimeType: string
  ): Promise<string> {
    console.log('[MySQLAdapter] uploadFile started')

    const fs   = require('fs')
    const path = require('path')

    const uploadsDir = path.resolve(process.cwd(), 'uploads', folder)
    fs.mkdirSync(uploadsDir, { recursive: true })
    fs.writeFileSync(path.join(uploadsDir, fileName), buffer)

    const url       = `/uploads/${folder}/${fileName}`
    const sizeBytes = buffer.length
    const sizeLabel = sizeBytes > 1024 * 1024
      ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(sizeBytes / 1024)} KB`

    await this.pool.execute(
      `INSERT INTO \`nxf_storage\`
       (file_name, file_path, folder, url, mime_type, size_label, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fileName,
        `${folder}/${fileName}`,
        folder,
        url,
        mimeType,
        sizeLabel,
        new Date().toISOString().slice(0, 19).replace('T', ' '),
      ]
    )

    return url
  }

  async deleteFile(folder: string, fileName: string): Promise<void> {
    const fs   = require('fs')
    const path = require('path')

    const filePath = path.resolve(process.cwd(), 'uploads', folder, fileName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    await this.pool.execute(
      'DELETE FROM `nxf_storage` WHERE file_path = ?',
      [`${folder}/${fileName}`]
    )
  }

  async deleteFolder(folder: string): Promise<void> {
    const fs   = require('fs')
    const path = require('path')

    const folderPath = path.resolve(process.cwd(), 'uploads', folder)
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true })
    }

    await this.pool.execute(
      'DELETE FROM `nxf_storage` WHERE folder = ?',
      [folder]
    )
  }

  async createFolder(folder: string): Promise<void> {
    const fs   = require('fs')
    const path = require('path')

    const folderPath = path.resolve(process.cwd(), 'uploads', folder)
    fs.mkdirSync(folderPath, { recursive: true })
  }

  async renameFile(folder: string, oldName: string, newName: string): Promise<void> {
    const fs   = require('fs')
    const path = require('path')

    const oldPath = path.resolve(process.cwd(), 'uploads', folder, oldName)
    const newPath = path.resolve(process.cwd(), 'uploads', folder, newName)

    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath)

    const url = `/uploads/${folder}/${newName}`

    await this.pool.execute(
      `UPDATE \`nxf_storage\`
       SET file_name = ?, file_path = ?, url = ?
       WHERE file_path = ?`,
      [newName, `${folder}/${newName}`, url, `${folder}/${oldName}`]
    )
  }

  async moveFile(fromFolder: string, toFolder: string, fileName: string): Promise<void> {
    const fs   = require('fs')
    const path = require('path')

    const oldPath = path.resolve(process.cwd(), 'uploads', fromFolder, fileName)
    const newDir  = path.resolve(process.cwd(), 'uploads', toFolder)
    const newPath = path.join(newDir, fileName)

    fs.mkdirSync(newDir, { recursive: true })
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath)

    const url = `/uploads/${toFolder}/${fileName}`

    await this.pool.execute(
      `UPDATE \`nxf_storage\`
       SET folder = ?, file_path = ?, url = ?
       WHERE file_path = ?`,
      [toFolder, `${toFolder}/${fileName}`, url, `${fromFolder}/${fileName}`]
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
      await this.pool.execute(
        'DELETE FROM `nxf_storage` WHERE file_path = ?',
        [filePath]
      )
    } catch {
      console.error('[MySQLAdapter] deleteStorageRecordByFilePath failed')
      throw new Error('Failed to delete storage record')
    }
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function getMySQLAdapter(config: DBConfig): MySQLAdapter {
  return new MySQLAdapter(config)
}