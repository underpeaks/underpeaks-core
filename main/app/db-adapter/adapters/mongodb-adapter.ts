import { MongoClient, Db, ObjectId } from 'mongodb'
import { DBAdapter, DBConfig, ColumnDef } from '../types'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { CreateDataModels } from '../utils/create-data-models'
const DEFAULT_BUCKETS = ['system', 'themes', 'extensions', 'projects', 'avatars', 'logos', 'uploads'];


export class MongoDBAdapter implements DBAdapter {
  supportsBuiltInAuth = false

  private _config: DBConfig
  private client: MongoClient
  private db?: Db

  constructor(config: DBConfig) {
    if (!config.connectionString) {
      throw new Error('[MongoDBAdapter] connectionString is required')
    }

    this._config = config
    this.client = new MongoClient(config.connectionString)
  }

  get config(): DBConfig {
    return this._config
  }

  private async getDb(): Promise<Db> {
    if (!this.db) {
      await this.client.connect()
      this.db = this.client.db(this._config.database)
    }
    return this.db
  }

  /** -----------------------------
   * CONNECTION
   * ----------------------------- */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.connect()
      await this.client.db().command({ ping: 1 })
      return { success: true, message: 'Connected to MongoDB successfully.' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to MongoDB.' }
    }
  }

  /** -----------------------------
   * PASSWORD UTILS
   * ----------------------------- */
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash)
  }

  /** -----------------------------
   * CRUD
   * ----------------------------- */
  async create(config: DBConfig, collection: string, data: any): Promise<string> {
    const db = await this.getDb()
    const res = await db.collection(collection).insertOne(data)
    return res.insertedId.toString()
  }

  async read(config: DBConfig, collection: string, query: any = {}) {
    const db = await this.getDb()
    return db.collection(collection).find(query).toArray()
  }

  async update(config: DBConfig, collection: string, id: string, data: any) {
    const db = await this.getDb()
    if (!ObjectId.isValid(id)) throw new Error('Invalid MongoDB id')
    await db.collection(collection).updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    )
    return true
  }

  async delete(config: DBConfig, collection: string, id: string) {
    const db = await this.getDb()
    if (!ObjectId.isValid(id)) throw new Error('Invalid MongoDB id')
    await db.collection(collection).deleteOne({ _id: new ObjectId(id) })
    return true
  }

  /** -----------------------------
   * AUTH & USERS (Mongo Native)
   * ----------------------------- */

  async registerUserInAuth(
    config: DBConfig,
    data: { email: string; password: string; fullName?: string }
  ) {
    if (!data.email || !data.password) {
      throw new Error('Email and password required')
    }

    const existing = await this.findUserByEmail(config, data.email)
    if (existing) return { id: existing.user_id }

    const hashed = await this.hashPassword(data.password)
    const user_id = crypto.randomUUID()

    await this.create(config, 'nxf_users', {
      user_id,
      user_email: data.email,
      full_name: data.fullName || '',
      password_hash: hashed,
      role: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return { id: user_id }
  }

  async createAdminUser(
    config: DBConfig,
    data: {
      user_id: string
      user_email: string
      full_name: string
      password: string
      role: string
    }
  ) {
    if (!data.user_email) throw new Error('Admin user must have an email')
    if (!data.password) throw new Error('Admin user must have a password')

    const hashed = await this.hashPassword(data.password)

    await this.create(config, 'nxf_users', {
      user_id: data.user_id,
      user_email: data.user_email,
      full_name: data.full_name || '',
      password_hash: hashed,
      role: data.role || 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return data.user_id
  }

  async findUserByEmail(config: DBConfig, email: string) {
    if (!email) return null
    const users = await this.read(config, 'nxf_users', { user_email: email })
    return users[0] || null
  }

  async findUserByEmailWithRetry(
    config: DBConfig,
    email: string,
    retries = 5,
    delay = 300
  ) {
    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(config, email)
      if (user) return user
      await new Promise((r) => setTimeout(r, delay))
    }
    return null
  }

  /** -----------------------------
   * PROJECTS & TENANTS
   * ----------------------------- */
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const project_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_projects', {
      project_id,
      name: data.name,
      user_id: data.user_id,
      created_at: new Date().toISOString(),
    })
    return project_id
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    const projects = await this.read(config, 'nxf_system_projects', {
      user_id: ownerId,
    })
    return projects[0] || null
  }

  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const ten_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_tenants', {
      ten_id,
      subdomain: data.subdomain,
      user_email: data.user_email,
      created_at: new Date().toISOString(),
    })
    return ten_id
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    const tenants = await this.read(config, 'nxf_system_tenants', {
      user_email: email,
    })
    return tenants[0] || null
  }

  /** -----------------------------
   * DATA MODELS
   * ----------------------------- */
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) {
      throw new Error('Missing DB config or projectId')
    }
    return CreateDataModels(this, projectId)
  }

  async createDataModelsFromUserEmail(email: string) {
    if (!email) throw new Error('Missing User Email')

    const user = await this.findUserByEmailWithRetry(this.config, email)
    if (!user?.user_id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.user_id)
    if (!project?.project_id) throw new Error('Project not found')

    return this.CreateDataModels(project.project_id)
  }

  /** -----------------------------
   * INSTALLER CONFIG
   * ----------------------------- */
  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    if (!data.project_id) throw new Error('project_id is required')

    const id = await this.create(config, 'nxf_system_config', {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return id
  }

  /** -----------------------------
   * TABLE MANAGEMENT (NO-OP)
   * ----------------------------- */
  async createTable(_tableName: string, _schema?: { columns: ColumnDef[] }) {
    console.log('[MongoDBAdapter] createTable skipped (MongoDB)')
    return true
  }

  /** -----------------------------
   * BUILT-IN AUTH (NOT SUPPORTED)
   * ----------------------------- */
  async signUpWithEmailPassword() {
    return { error: 'MongoDB does not support built-in auth' }
  }

  async validateBuiltInSession() {
    return null
  }

  async login() {
    return {
      error: 'MongoDB login handled via password comparison, not built-in auth',
    }
  }

  /** -----------------------------
 * STORAGE SETUP (Mongo)
 * ----------------------------- */
async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
  const db = await this.getDb()

  const collections = await db.listCollections().toArray()
  const exists = collections.some(c => c.name === 'nxf_storage')

  if (!exists) {
    await db.createCollection('nxf_storage')

    await db.collection('nxf_storage').createIndexes([
      {
        key: { storage_id: 1 },
        name: 'storage_id_unique',
        unique: true,
      },
      {
        key: { folder: 1 },
        name: 'folder_idx',
      },
      {
        key: { file_path: 1 },
        name: 'file_path_idx',
      },
      {
        key: { created_at: -1 },
        name: 'created_at_idx',
      },
    ])
  }

  return { success: true, buckets: DEFAULT_BUCKETS };
}

}
