import { Pool, PoolConfig } from 'pg'
import bcrypt               from 'bcrypt'
import crypto               from 'crypto'
import { DBAdapter, DBConfig, ColumnDef, StorageFile } from '../types'
import { CreateUserDataModels } from '../utils/create-data-models'

export class PostgresAdapter implements DBAdapter {

  private pool: Pool
  public  config: DBConfig

  private readonly DEFAULT_BUCKETS = [
    'system', 'themes', 'extensions', 'projects',
    'avatars', 'logos', 'uploads',
  ]

 constructor(config: DBConfig) {
  if (!config) throw new Error('DBConfig must be provided via adapter')
  this.config = config

  this.pool = new Pool({
    host:     config.host,
    user:     config.user,
    password: config.password,
    database: config.database,
    port:     config.port ? Number(config.port) : 5432,
    max:      10,
    options:  `-c timezone=UTC`,
  })
}

  private async connect(): Promise<void> {
    // Pool manages connections automatically — just verify it works
    const client = await this.pool.connect()
    client.release()
  }

  async testConnection(): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      await this.connect()
      await this.pool.query('SELECT 1')
      return { success: true, message: 'Connected to Postgres successfully.' }
    } catch (err: any) {
      const message = err.message || 'Failed to connect'
      return { success: false, message, error: message }
    }
  }

  // ─── Password ──────────────────────────────────────────────────────────────

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10)
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password.trim(), hash.trim())
  }

  // ─── Basic CRUD ────────────────────────────────────────────────────────────

  async create(_config: DBConfig, table: string, data: Record<string, any>): Promise<any> {
    await this.connect()

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

    const res = await this.pool.query(sql, values)
    return res.rows[0]
  }

  async read(_config: DBConfig, table: string, query?: any): Promise<any> {
    await this.connect()

    let sql             = `SELECT * FROM "${table}"`
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

    const res = await this.pool.query(sql, values)
    return res.rows
  }

  async update(
    _config:  DBConfig,
    table:    string,
    id:       string,
    data:     any,
    idColumn: string = 'id'
  ): Promise<any> {
    await this.connect()

    const keys   = Object.keys(data)
    const values = Object.values(data).map(v =>
      v instanceof Date ? v.toISOString() : v
    )
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
    const sql = `UPDATE "${table}" SET ${setClause} WHERE "${idColumn}" = $${keys.length + 1} RETURNING *`

    const res = await this.pool.query(sql, [...values, id])
    return res.rows[0]
  }

  async delete(
    _config:  DBConfig,
    table:    string,
    id:       string,
    idColumn: string = 'id'
  ): Promise<any> {
    await this.connect()
    const res = await this.pool.query(
      `DELETE FROM "${table}" WHERE "${idColumn}" = $1 RETURNING *`,
      [id]
    )
    return res.rows[0]
  }

  // ─── System Config ─────────────────────────────────────────────────────────

  async findSystemConfigByUserId(config: DBConfig, userId: string): Promise<any> {
    try {
      if (!userId) {
        console.warn('[PostgresAdapter] findSystemConfigByUserId called with no userId')
        return null
      }

      await this.connect()
      const result = await this.pool.query(
        `SELECT * FROM nxf_system_config WHERE user_id = $1 LIMIT 1`,
        [userId]
      )

      if (!result.rows.length) {
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

  // ─── Table Creation ────────────────────────────────────────────────────────

  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, ColumnDef> }
  ): Promise<void> {
    await this.connect()

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
        if (col.is_primary)         constraints.push('PRIMARY KEY')
        if (col.unique)             constraints.push('UNIQUE')
        if (col.nullable === false) constraints.push('NOT NULL')

        return `"${col.name}" ${typeSql} ${constraints.join(' ')}`
      })
      .join(',')

    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnsSql})`
    )
  }

  // ─── Data Models ───────────────────────────────────────────────────────────

  async CreateDataModels(projectId: string, selectedProjectType: string): Promise<any> {
    if (!projectId) throw new Error('Project ID is required')

    // Look up tenant to pass as 3rd arg — CreateUserDataModels now requires it
    const tenantResult = await this.pool.query(
      'SELECT ten_id FROM "nxf_system_tenants" LIMIT 1'
    )
    const tenant   = tenantResult.rows[0]
    const tenantId = tenant?.ten_id ?? ''

    return await CreateUserDataModels(
      this,
      projectId,
      tenantId,
      selectedProjectType,
      []
    )
  }

  async createDataModelsFromUserEmail(email: string, selectedProjectType: string): Promise<any> {
    const user = await this.findUserByEmail(this.config, email)
    if (!user?.user_id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.user_id)
    if (!project?.project_id) throw new Error('Project not found')

    return this.CreateDataModels(project.project_id, selectedProjectType)
  }

  // ─── User Helpers ──────────────────────────────────────────────────────────

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

  async findUserByEmail(config: DBConfig, email: string): Promise<any> {
    const rows = await this.read(config, 'nxf_users', { user_email: email })
    return rows?.[0] || null
  }

  async findUserByToken(token: string): Promise<any> {
    await this.connect()
    const res = await this.pool.query(
      `SELECT * FROM nxf_users WHERE token=$1 AND token_ttl > NOW() LIMIT 1`,
      [token]
    )
    return res.rows[0] || null
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
      await new Promise(r => setTimeout(r, delay))
    }
    return null
  }

  async verifyEmail(
    config: DBConfig,
    data:   { token: string; email?: string }
  ): Promise<{ success: boolean; message?: string }> {
    const user = await this.findUserByToken(data.token)
    if (!user) throw new Error('Invalid or expired verification token')

    await this.pool.query(
      `UPDATE nxf_users
       SET email_verified=true, token=NULL, token_ttl=NULL, updated_at=NOW()
       WHERE user_id=$1`,
      [user.user_id]
    )

    return { success: true }
  }

  async resendVerificationEmail(config: DBConfig, email: string): Promise<{ success: boolean; token: string }> {
    const user = await this.findUserByEmail(config, email)
    if (!user) throw new Error('User not found')

    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.pool.query(
      `UPDATE nxf_users SET token=$1, token_ttl=$2, updated_at=NOW() WHERE user_id=$3`,
      [token, ttl, user.user_id]
    )

    return { success: true, token }
  }

  async updatePasswordByToken(token: string, newPassword: string): Promise<{ success: boolean }> {
    const user = await this.findUserByToken(token)
    if (!user) throw new Error('Invalid or expired token')

    await this.pool.query(
      `UPDATE nxf_users
       SET password_hash=$1, token=NULL, token_ttl=NULL, updated_at=NOW()
       WHERE user_id=$2`,
      [newPassword, user.user_id]
    )

    return { success: true }
  }

  async createPasswordResetToken(email: string): Promise<string> {
    const user = await this.findUserByEmail(this.config, email)
    if (!user) throw new Error('User not found')

    const token = crypto.randomBytes(32).toString('hex')
    const ttl   = new Date(Date.now() + 60 * 60 * 1000)

    await this.pool.query(
      `UPDATE nxf_users SET token=$1, token_ttl=$2, updated_at=NOW() WHERE user_id=$3`,
      [token, ttl, user.user_id]
    )

    return token
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async loginBasic(
    config:                DBConfig,
    email:                 string,
    password:              string,
    emailVerifiedRequired: boolean = true
  ): Promise<any> {
    const user = await this.findUserByEmail(config, email)
    if (!user)              return { success: false, error: 'User not found.' }
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

async loginWithPostgres(
  config:   DBConfig,
  email:    string,
  password: string,
  ip?:      string,
  ua?:      string
): Promise<any> {
  const basic = await this.loginBasic(config, email, password)
  if (!basic.success || !basic.user) return { success: false, error: basic.error }

  if (basic.user.role !== 'admin') {
    return {
      success: false,
      error:   'You do not have admin rights to access the console',
      user:    basic.user,
    }
  }

  const project = await this.findProjectByOwnerId(config, basic.user.user_id)
  if (!project) return { success: false, error: 'No project found for user' }

  const tenantResult = await this.pool.query(
    'SELECT ten_id FROM "nxf_system_tenants" LIMIT 1'
  )
  const tenant_id = tenantResult.rows[0]?.ten_id ?? null

  const accessToken  = crypto.randomUUID()
  const refreshToken = crypto.randomUUID()

  await this.create(config, 'nxf_system_tokens', {
    token_id:           crypto.randomUUID(),
    user_id:            basic.user.user_id,
    tenant_id,
    project_id:         project.project_id,
    access_token:       accessToken,
    refresh_token:      refreshToken,
    token_type:         'bearer',
    expires_at:         new Date(Date.now() + 8 * 60 * 60 * 1000),    // 8 hours
refresh_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),   // 24 hours// 30 days
    ip_address:         ip || null,
    user_agent:         ua || null,
    revoked:            false,
    created_at:         new Date(),
    updated_at:         new Date(),
  })

  return {
    success:   true,
    user:      basic.user,
    accessToken,
    refreshToken,
    projectId: project.project_id,
  }
}

  // ─── Registration ──────────────────────────────────────────────────────────

  async registerUser(
    config: DBConfig,
    data: {
      email:      string
      password:   string
      full_name?: string
      token:      string
      token_ttl:  Date
    }
  ): Promise<any> {
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

  // ─── Token Helpers ─────────────────────────────────────────────────────────

  async findTokenByAccessToken(accessToken: string): Promise<any> {
    await this.connect()
    const res = await this.pool.query(
      `SELECT * FROM nxf_system_tokens WHERE access_token=$1 LIMIT 1`,
      [accessToken]
    )
    return res.rows?.[0] || null
  }

  async findTokenByRefreshToken(refreshToken: string): Promise<any> {
    await this.connect()
    const res = await this.pool.query(
      `SELECT * FROM nxf_system_tokens WHERE refresh_token=$1 LIMIT 1`,
      [refreshToken]
    )
    return res.rows?.[0] || null
  }

  async extendToken(
    tokenId: string,
    updates: Partial<{ revoked: boolean; updated_at: string; expires_at: string }>
  ): Promise<boolean> {
    const setClauses: string[] = []
    const values:     any[]    = []
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

    if (!setClauses.length) return true

    values.push(tokenId)
    await this.pool.query(
      `UPDATE nxf_system_tokens SET ${setClauses.join(', ')} WHERE token_id = $${i}`,
      values
    )
    return true
  }

  // ─── Projects and Tenants ──────────────────────────────────────────────────

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
    const rows = await this.read(config, 'nxf_system_projects', { user_id: ownerId })
    return rows?.[0] || null
  }

  async createTenant(
  config: DBConfig,
  data: { subdomain: string; user_email: string; user_id?: string }
): Promise<string> {
  const ten_id = crypto.randomUUID()
  await this.create(config, 'nxf_system_tenants', {
    ten_id,
    subdomain:  data.subdomain,
    user_email: data.user_email,
    user_id:    data.user_id || null,
    created_at: new Date(),
  })
  return ten_id
}

  async findTenantByUserEmail(config: DBConfig, email: string): Promise<any> {
    const rows = await this.read(config, 'nxf_system_tenants', { user_email: email })
    return rows?.[0] || null
  }

  async findTenantByUserID(config: DBConfig, user_id: string): Promise<any> {
    const rows = await this.read(config, 'nxf_system_tenants', { user_id })
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

  // ─── Storage Buckets ───────────────────────────────────────────────────────

 async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
  await this.connect()

  // Resolve project and tenant to satisfy NOT NULL constraints
  const projectResult = await this.pool.query(
    'SELECT project_id FROM "nxf_system_projects" LIMIT 1'
  )
  const project_id = projectResult.rows[0]?.project_id ?? null

  const tenantResult = await this.pool.query(
    'SELECT ten_id FROM "nxf_system_tenants" LIMIT 1'
  )
  const tenant_id = tenantResult.rows[0]?.ten_id ?? null

  for (const folder of this.DEFAULT_BUCKETS) {
    // Use client directly — avoids re-entrant connection issues with single-client adapter
    const existing = await this.pool.query(
      'SELECT storage_id FROM "nxf_storage" WHERE folder = $1 LIMIT 1',
      [folder]
    )

    if (!existing.rows.length) {
      await this.pool.query(
        `INSERT INTO "nxf_storage"
         (storage_id, project_id, tenant_id, folder, file_name, file_path, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          project_id,
          tenant_id,
          folder,
          '',
          folder,
          new Date().toISOString(),
        ]
      )
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

  // ─── Demo Content ──────────────────────────────────────────────────────────

 async installDemoContent(
  config: DBConfig,
  selectedProjectType: string
): Promise<{ success: boolean; error?: string; inserted?: number; skipped?: boolean }> {
  const fs   = require('fs')
  const path = require('path')

  try {
    await this.connect()

    const userResult = await this.pool.query(
      `SELECT user_id FROM "nxf_users" WHERE role = 'admin' LIMIT 1`
    )
    if (!userResult.rows.length) return { success: false, error: 'No admin user found' }
    const adminUserId = userResult.rows[0].user_id

    const projectResult = await this.pool.query(
      'SELECT project_id FROM "nxf_system_projects" LIMIT 1'
    )
    if (!projectResult.rows.length) return { success: false, error: 'No project found' }
    const projectId = projectResult.rows[0].project_id

    const tenantResult = await this.pool.query(
      'SELECT ten_id FROM "nxf_system_tenants" LIMIT 1'
    )
    if (!tenantResult.rows.length) return { success: false, error: 'No tenant found' }
    const tenantId = tenantResult.rows[0].ten_id

    // ── Pre-build the model name → sm_id resolver map ──────────────────────
    // Used by the nxf_pages installer to resolve "model": "nxf_product"
    // into the actual sm_id at install time.

    const modelNameToId = new Map<string, string>()
    try {
      const modelResult = await this.pool.query(
        'SELECT sm_id, name FROM "nxf_system_models" WHERE project_id = $1',
        [projectId]
      )
      for (const m of modelResult.rows) {
        if (m.name && m.sm_id) modelNameToId.set(m.name, m.sm_id)
      }
      console.log(
        `[PostgresAdapter] Built model resolver map — ${modelNameToId.size} models indexed`
      )
    } catch (err: any) {
      console.warn('[PostgresAdapter] Failed to build model resolver map:', err.message)
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
        console.log('[PostgresAdapter] Demo folder not found, skipping:', basePath)
        continue
      }

      const files = fs.readdirSync(basePath).filter((f: string) => f.endsWith('.json'))

      for (const file of files) {
        const raw = fs.readFileSync(path.join(basePath, file), 'utf-8')

        let json: any
        try {
          json = JSON.parse(raw)
        } catch {
          console.warn(`[PostgresAdapter] Skipping invalid JSON: ${file}`)
          continue
        }

        const tableName = file.replace('.json', '')
        const rows      = Array.isArray(json) ? json : json?.demo_data

        if (!rows || !Array.isArray(rows)) continue

        const colResult = await this.pool.query(
          `SELECT column_name, data_type
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1`,
          [tableName]
        )

        if (!colResult.rows.length) {
          console.log(`[PostgresAdapter] Skipping ${tableName} — table does not exist`)
          continue
        }

        const tableColumns = colResult.rows.map((c: any) => c.column_name)

        console.log(`[PostgresAdapter] Inserting into ${tableName} — ${rows.length} rows`)

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
                  `[PostgresAdapter] Page "${enriched.slug}" references model "${enriched.model}" which does not exist — model_id left null`
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
              if (filtered[key] !== null && typeof filtered[key] === 'object') {
                filtered[key] = JSON.stringify(filtered[key])
              }
            }

            const keys   = Object.keys(filtered)
            const cols   = keys.map((k) => `"${k}"`).join(', ')
            const params = keys.map((_, i) => `$${i + 1}`).join(', ')
            const values = Object.values(filtered)

            await this.pool.query(
              `INSERT INTO "${tableName}" (${cols}) VALUES (${params}) ON CONFLICT DO NOTHING`,
              values
            )

            totalInserted++
          } catch (err: any) {
            console.warn(`[PostgresAdapter] Skipping row in ${tableName}:`, err.message)
          }
        }
      }
    }

    return { success: true, inserted: totalInserted }

  } catch (err: any) {
    console.error('[PostgresAdapter] installDemoContent failed:', err.message)
    return { success: false, inserted: 0, error: 'Failed to install demo content' }
  }
}

  // ─── Core CRUD ─────────────────────────────────────────────────────────────

async readAll(config: DBConfig, table: string): Promise<any[]> {
  try {
    console.log(`[PostgresAdapter] readAll — table: ${table}`)
    const result = await this.pool.query(`SELECT * FROM "${table}"`)
    console.log(`[PostgresAdapter] readAll — table: ${table} — returned ${result.rows.length} rows`)
    return result.rows
  } catch (err: any) {
    console.error(`[PostgresAdapter] readAll FAILED — table: ${table} — ${err.message}`)
    console.error(`[PostgresAdapter] readAll full error:`, err)
    throw new Error(`readAll failed on table "${table}": ${err.message}`)
  }
}

  // ─── Users & Auth ──────────────────────────────────────────────────────────

  async getUserById(uid: string): Promise<{ user?: any; error?: string }> {
    try {
      if (!uid) return { error: 'UID is required' }

      const result = await this.pool.query(
        'SELECT * FROM "nxf_users" WHERE user_id = $1 LIMIT 1',
        [uid]
      )

      if (!result.rows.length) return { error: 'User not found' }
      return { user: result.rows[0] }
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

      const result = await this.pool.query(
        'SELECT * FROM "nxf_users" WHERE user_id = $1 LIMIT 1',
        [userId]
      )

      if (!result.rows.length) return { allowed: false, reason: 'User not found' }

      const user = result.rows[0]
      if (user.status === 'suspended') return { allowed: false, user, reason: 'Account suspended' }
      if (user.status === 'inactive')  return { allowed: false, user, reason: 'Account inactive' }

      return { allowed: true, user }

    } catch (err: any) {
      console.error('[PostgresAdapter] checkUserStatus failed')
      return { allowed: false, reason: err.message || 'Status check failed' }
    }
  }

  async syncAuthUserToDatabase(
    config: DBConfig,
    user: { uid: string; email: string; full_name: string; notes?: string }
  ): Promise<string> {
    if (!user?.uid)      throw new Error('User UID is required')
    if (!user.full_name) throw new Error('Full name is required')

    const existing = await this.pool.query(
      'SELECT user_id FROM "nxf_users" WHERE user_id = $1 LIMIT 1',
      [user.uid]
    )

    if (!existing.rows.length) {
      await this.pool.query(
        `INSERT INTO "nxf_users"
         (user_id, user_email, full_name, role, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, 'user', 'active', $4, $5, $6)`,
        [
          user.uid,
          user.email || '',
          user.full_name,
          user.notes || '',
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      )
    } else {
      await this.pool.query(
        `UPDATE "nxf_users"
         SET user_email = $1, full_name = $2, updated_at = $3
         WHERE user_id = $4`,
        [user.email || '', user.full_name, new Date().toISOString(), user.uid]
      )
    }

    return user.uid
  }

  async writeActivityLog(
    config: DBConfig,
    entry: { user_id: string; action: string; context?: string }
  ): Promise<void> {
    try {
      const projectResult = await this.pool.query(
        'SELECT project_id FROM "nxf_system_projects" LIMIT 1'
      )
      const project_id = projectResult.rows[0]?.project_id ?? null

      const tenantResult = await this.pool.query(
        'SELECT ten_id FROM "nxf_system_tenants" LIMIT 1'
      )
      const tenant_id = tenantResult.rows[0]?.ten_id ?? null

      await this.pool.query(
        `INSERT INTO "nxf_system_activity_logs"
         (log_id, project_id, tenant_id, user_id, action, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          project_id,
          tenant_id,
          entry.user_id,
          entry.action,
          entry.context ?? null,
          new Date().toISOString(),
        ]
      )
    } catch (err: any) {
      console.error('[PostgresAdapter] writeActivityLog failed:', err.message)
    }
  }

  // ─── Table / Schema Management ─────────────────────────────────────────────

  async alterTable(
    tableName: string,
    changes: { add?: ColumnDef[]; drop?: string[]; rename?: { from: string; to: string } }
  ): Promise<any> {
    console.log(`[PostgresAdapter] alterTable — ${tableName}`)

    const statements: string[] = []

    if (changes.add?.length) {
      for (const col of changes.add) {
        let typeSql = ''
        switch (col.type.toLowerCase()) {
          case 'uuid':                      typeSql = 'UUID';             break
          case 'string': case 'text':       typeSql = 'TEXT';             break
          case 'json': case 'jsonb':
          case 'array':                     typeSql = 'JSONB';            break
          case 'datetime': case 'date':
          case 'timestamp':                 typeSql = 'TIMESTAMP';        break
          case 'integer': case 'int':       typeSql = 'INTEGER';          break
          case 'bigint':                    typeSql = 'BIGINT';           break
          case 'boolean':                   typeSql = 'BOOLEAN';          break
          case 'float': case 'number':
          case 'decimal': case 'double':    typeSql = 'DOUBLE PRECISION'; break
          default:
            throw new Error(`Unsupported column type: ${col.type}`)
        }
        const notNull = col.nullable === false ? ' NOT NULL' : ''
        statements.push(
          `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.name}" ${typeSql}${notNull};`
        )
      }
    }

    if (changes.drop?.length) {
      for (const colName of changes.drop) {
        statements.push(`ALTER TABLE "${tableName}" DROP COLUMN IF EXISTS "${colName}";`)
      }
    }

    if (changes.rename) {
      statements.push(
        `ALTER TABLE "${tableName}" RENAME COLUMN "${changes.rename.from}" TO "${changes.rename.to}";`
      )
    }

    for (const sql of statements) {
      console.log(`[PostgresAdapter] alterTable executing: ${sql}`)
      await this.pool.query(sql)
    }

    console.log(`[PostgresAdapter] alterTable completed for ${tableName}`)
    return true
  }

  async dropTable(tableName: string): Promise<any> {
    console.log(`[PostgresAdapter] dropTable — ${tableName}`)
    await this.pool.query(`DROP TABLE IF EXISTS "${tableName}"`)
    console.log(`[PostgresAdapter] dropTable completed — ${tableName}`)
    return true
  }

  async renameTable(oldName: string, newName: string): Promise<any> {
    console.log(`[PostgresAdapter] renameTable — ${oldName} → ${newName}`)
    await this.pool.query(`ALTER TABLE "${oldName}" RENAME TO "${newName}"`)
    console.log(`[PostgresAdapter] renameTable completed — ${oldName} → ${newName}`)
    return true
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  async listConversations(
    config:     DBConfig,
    project_id: string,
    uid:        string,
    limit       = 10
  ): Promise<Array<Record<string, any>>> {
    const result = await this.pool.query(
      `SELECT * FROM "nxf_system_conversations"
       WHERE project_id = $1
       ORDER BY last_message_at DESC
       LIMIT $2`,
      [project_id, limit]
    )

    const conversations = result.rows
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
        const con_id      = conv.con_id ?? conv.id
        const countResult = await this.pool.query(
          `SELECT COUNT(*) as count FROM "nxf_system_messages"
           WHERE conversation_id = $1 AND recipient_id = $2 AND is_read = false`,
          [con_id, uid]
        )
        const unread_count = parseInt(countResult.rows[0]?.count ?? '0')
        return { ...conv, con_id, id: con_id, unread_count }
      })
    )

    return withUnread
  }

  async getConversationThread(
    config:         DBConfig,
    conversationId: string
  ): Promise<Array<Record<string, any>>> {
    const result = await this.pool.query(
      `SELECT * FROM "nxf_system_messages"
       WHERE conversation_id = $1
       ORDER BY sent_at ASC`,
      [conversationId]
    )

    const seen = new Set<string>()
    return result.rows.filter((msg) => {
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
    const now    = new Date().toISOString()
    const mes_id = crypto.randomUUID()

    const projectResult = await this.pool.query(
      'SELECT project_id FROM "nxf_system_projects" LIMIT 1'
    )
    const project_id = projectResult.rows[0]?.project_id ?? null

    const tenantResult = await this.pool.query(
      'SELECT ten_id FROM "nxf_system_tenants" LIMIT 1'
    )
    const tenant_id = tenantResult.rows[0]?.ten_id ?? null

    await this.pool.query(
      `INSERT INTO "nxf_system_messages"
       (mes_id, project_id, tenant_id, conversation_id, sender_id, recipient_id,
        content, is_read, sent_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NULL, $6, false, $7, $8, $9)`,
      [mes_id, project_id, tenant_id, conversationId, senderId, content, now, now, now]
    )

    try {
      await this.pool.query(
        `UPDATE "nxf_system_conversations"
         SET last_message_preview = $1, last_message_at = $2, updated_at = $3
         WHERE con_id = $4`,
        [content.slice(0, 100), now, now, conversationId]
      )
    } catch {
      console.warn('[PostgresAdapter] sendMessage — conversation preview update failed')
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
    await this.pool.query(
      `UPDATE "nxf_system_messages"
       SET is_read = true, updated_at = $1
       WHERE conversation_id = $2 AND recipient_id = $3 AND is_read = false`,
      [new Date().toISOString(), conversationId, uid]
    )
    return { success: true }
  }

  async markAllMessagesRead(
    config: DBConfig,
    uid:    string
  ): Promise<{ success: boolean }> {
    await this.pool.query(
      `UPDATE "nxf_system_messages"
       SET is_read = true, updated_at = $1
       WHERE recipient_id = $2 AND is_read = false`,
      [new Date().toISOString(), uid]
    )
    return { success: true }
  }

  async deleteConversation(
    config:         DBConfig,
    conversationId: string
  ): Promise<{ success: boolean }> {
    try {
      await this.pool.query(
        'DELETE FROM "nxf_system_messages" WHERE conversation_id = $1',
        [conversationId]
      )
      await this.pool.query(
        'DELETE FROM "nxf_system_conversations" WHERE con_id = $1',
        [conversationId]
      )
      return { success: true }
    } catch (err: any) {
      throw new Error(`Failed to delete conversation: ${err.message}`)
    }
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  async listNotifications(
    config:     DBConfig,
    uid:        string,
    project_id: string,
    limit       = 20
  ): Promise<Array<Record<string, any>>> {
    const result = await this.pool.query(
      `SELECT * FROM "nxf_system_notifications"
       WHERE project_id = $1 AND user_id = $2 AND status != 'deleted'
       ORDER BY created_at DESC
       LIMIT $3`,
      [project_id, uid, limit]
    )
    return result.rows
  }

  async markNotificationRead(
    config:         DBConfig,
    notificationId: string,
    uid:            string
  ): Promise<{ success: boolean }> {
    const existing = await this.pool.query(
      'SELECT * FROM "nxf_system_notifications" WHERE notif_id = $1 LIMIT 1',
      [notificationId]
    )

    if (!existing.rows.length) throw new Error('Notification not found')
    if (existing.rows[0].user_id !== uid) throw new Error('Forbidden — notification does not belong to this user')

    const now = new Date().toISOString()

    await this.pool.query(
      `UPDATE "nxf_system_notifications"
       SET status = 'read', is_read = true, read_at = $1, updated_at = $2
       WHERE notif_id = $3`,
      [now, now, notificationId]
    )

    return { success: true }
  }

  async markAllNotificationsRead(
    config:     DBConfig,
    uid:        string,
    project_id: string
  ): Promise<{ success: boolean; updated: number }> {
    const now = new Date().toISOString()

    const result = await this.pool.query(
      `UPDATE "nxf_system_notifications"
       SET status = 'read', is_read = true, read_at = $1, updated_at = $2
       WHERE project_id = $3 AND user_id = $4 AND status = 'unread'`,
      [now, now, project_id, uid]
    )

    return { success: true, updated: result.rowCount ?? 0 }
  }

  // ─── API Keys ──────────────────────────────────────────────────────────────

  async listApiKeys(
    config:     DBConfig,
    project_id: string
  ): Promise<Array<{
    api_id:       string
    name:         string
    key_prefix:   string
    status:       string
    last_used_at: string | null
    created_at:   string
  }>> {
    const result = await this.pool.query(
      `SELECT api_id, name, key_prefix, status, last_used_at, created_at
       FROM "nxf_system_apis"
       WHERE project_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [project_id]
    )
    return result.rows
  }

  async getApiKey(
    config: DBConfig,
    api_id: string
  ): Promise<Record<string, any> | null> {
    const result = await this.pool.query(
      'SELECT * FROM "nxf_system_apis" WHERE api_id = $1 LIMIT 1',
      [api_id]
    )
    return result.rows[0] ?? null
  }

  async revokeApiKey(
    config:     DBConfig,
    api_id:     string,
    project_id: string
  ): Promise<{ success: boolean }> {
    const existing = await this.pool.query(
      'SELECT * FROM "nxf_system_apis" WHERE api_id = $1 LIMIT 1',
      [api_id]
    )

    if (!existing.rows.length) throw new Error('API key not found')
    if (existing.rows[0].project_id !== project_id) throw new Error('Forbidden')

    const now = new Date().toISOString()

    await this.pool.query(
      `UPDATE "nxf_system_apis"
       SET status = 'revoked', revoked_at = $1, updated_at = $2
       WHERE api_id = $3`,
      [now, now, api_id]
    )

    console.log(`[PostgresAdapter] revokeApiKey — key ${api_id} revoked`)
    return { success: true }
  }

  // ─── Storage ───────────────────────────────────────────────────────────────

  async listFolders(): Promise<string[]> {
    try {
      const result = await this.pool.query(
        'SELECT DISTINCT folder FROM "nxf_storage" WHERE folder IS NOT NULL'
      )
      return result.rows.map((r: any) => r.folder).filter(Boolean)
    } catch {
      console.error('[PostgresAdapter] listFolders failed')
      return []
    }
  }

  async listFiles(folder: string): Promise<StorageFile[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM "nxf_storage" WHERE folder = $1',
        [folder]
      )

      return result.rows.map((row: any) => ({
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
      console.error('[PostgresAdapter] listFiles failed')
      return []
    }
  }

  async uploadFile(
    folder:   string,
    fileName: string,
    buffer:   Buffer,
    mimeType: string
  ): Promise<string> {
    console.log('[PostgresAdapter] uploadFile started')

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

    await this.pool.query(
      `INSERT INTO "nxf_storage"
       (file_name, file_path, folder, url, mime_type, size_label, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [fileName, `${folder}/${fileName}`, folder, url, mimeType, sizeLabel, new Date().toISOString()]
    )

    return url
  }

  async deleteFile(folder: string, fileName: string): Promise<void> {
    const fs   = require('fs')
    const path = require('path')

    const filePath = path.resolve(process.cwd(), 'uploads', folder, fileName)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    await this.pool.query(
      'DELETE FROM "nxf_storage" WHERE file_path = $1',
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

    await this.pool.query(
      'DELETE FROM "nxf_storage" WHERE folder = $1',
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

    await this.pool.query(
      `UPDATE "nxf_storage"
       SET file_name = $1, file_path = $2, url = $3
       WHERE file_path = $4`,
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

    await this.pool.query(
      `UPDATE "nxf_storage"
       SET folder = $1, file_path = $2, url = $3
       WHERE file_path = $4`,
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
      await this.pool.query(
        'DELETE FROM "nxf_storage" WHERE file_path = $1',
        [filePath]
      )
    } catch {
      console.error('[PostgresAdapter] deleteStorageRecordByFilePath failed')
      throw new Error('Failed to delete storage record')
    }
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────

export function getPostgresAdapter(config: DBConfig): PostgresAdapter {
  return new PostgresAdapter(config)
}