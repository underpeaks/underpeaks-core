// lib/db-adapter/adapters/mongodb-adapter.ts
import { MongoClient, Db, ObjectId } from 'mongodb';
import { DBAdapter, DBConfig, ColumnDef } from '../types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { CreateDataModels } from '../utils/create-data-models';

export class MongoDBAdapter implements DBAdapter {
  private _config: DBConfig;
  private client: MongoClient;
  private db?: Db;

  constructor(config: DBConfig) {
    if (!config.connectionString) throw new Error('MongoDB connection string is required');
    this._config = config;
    this.client = new MongoClient(config.connectionString);
  }

  get config(): DBConfig {
    return this._config;
  }

  private async getDb(): Promise<Db> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this._config.database);
    }
    return this.db;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.connect();
      await this.client.db().command({ ping: 1 });
      return { success: true, message: 'Connected to MongoDB successfully.' };
    } catch (err: any) {
      return { success: false, message: err.message ?? 'Failed to connect to MongoDB.' };
    }
  }

  // -----------------------
  // Password helpers
  // -----------------------
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  // -----------------------
  // CRUD
  // -----------------------
  async create(config: DBConfig, collection: string, data: any) {
    const db = await this.getDb();
    const result = await db.collection(collection).insertOne(data);
    return result.insertedId?.toString();
  }

  async read(config: DBConfig, collection: string, query: any = {}) {
    const db = await this.getDb();
    return db.collection(collection).find(query).toArray();
  }

  async update(config: DBConfig, collection: string, id: string, data: any) {
    const db = await this.getDb();

    // Ensure id is ObjectId
    if (!ObjectId.isValid(id)) throw new Error('Invalid MongoDB _id');

    const filter = { _id: new ObjectId(id) };
    const result = await db.collection(collection).updateOne(filter, { $set: data });
    return result.modifiedCount > 0;
  }

  /** ---------------------------
   * DELETE helper
   * --------------------------- */
  async delete(config: DBConfig, collection: string, id: string) {
    const db = await this.getDb();

    if (!ObjectId.isValid(id)) throw new Error('Invalid MongoDB _id');

    const filter = { _id: new ObjectId(id) };
    const result = await db.collection(collection).deleteOne(filter);
    return result.deletedCount > 0;
  }

  
  // -----------------------
  // Auth
  // -----------------------
  async login(config: DBConfig, email: string, password: string) {
    const user = await this.findUserByEmail(config, email);
    if (!user) return { error: 'User not found' };
    const isValid = await this.comparePassword(password, user.password);
    if (!isValid) return { error: 'Invalid password' };
    const { password: _, ...userSafe } = user;
    return { user: userSafe };
  }

  async register(config: DBConfig, data: { email: string; password: string; full_name?: string }) {
    const hashed = await this.hashPassword(data.password);
    const userId = crypto.randomUUID();
    await this.create(config, 'nxf_users', {
      user_id: userId,
      user_email: data.email,
      password: hashed,
      full_name: data.full_name || null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { userId };
  }

  async logout(_config: DBConfig, _token?: string) {
    return { success: true }; // Token revocation handled in token table
  }

  async getCurrentUser(config: DBConfig, token?: string) {
    if (!token) return null;
    const tokenDoc = await this.findTokenByAccessToken(token);
    if (!tokenDoc) return null;
    const user = await this.findUserByEmail(config, tokenDoc.user_email);
    if (!user) return null;
    const { password, ...userSafe } = user;
    return userSafe;
  }

  async sendResetEmail(config: DBConfig, email: string, redirectUrl: string) {
    const user = await this.findUserByEmail(config, email);
    if (!user) return { success: false, error: 'User not found' };
    const resetToken = crypto.randomUUID();
    await this.create(config, 'nxf_tokens', {
      token: resetToken,
      type: 'password_reset',
      user_email: email,
      redirect_url: redirectUrl,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 3600 * 1000),
    });
    return { success: true };
  }

 async resetPassword(config: DBConfig, token: string, newPassword: string) {
    // Find the token
    const tokens = await this.read(config, 'nxf_tokens', { token, type: 'password_reset' });
    if (!tokens.length) return { success: false, error: 'Invalid token' };

    const email = tokens[0].user_email;

    // Hash the new password
    const hashed = await this.hashPassword(newPassword);

    // Find the user
    const users = await this.read(config, 'nxf_users', { user_email: email });
    if (!users.length) return { success: false, error: 'User not found' };

    // Convert ObjectId to string before updating
    const userId = users[0]._id.toString();
    await this.update(config, 'nxf_users', userId, { password: hashed });

    return { success: true };
  }


  // -----------------------
  // Token management
  // -----------------------
  async createToken(data: any) {
    const tokenId = crypto.randomUUID();
    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    await this.create(this.config, 'nxf_tokens', {
      token_id: tokenId,
      access_token: accessToken,
      refresh_token: refreshToken,
      user_email: data.user_email,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
    return { token_id: tokenId, access_token: accessToken, refresh_token: refreshToken };
  }

  async findTokenByAccessToken(hash: string) {
    const tokens = await this.read(this.config, 'nxf_tokens', { access_token: hash });
    return tokens.length ? tokens[0] : null;
  }

  async findTokenByRefreshToken(hash: string) {
    const tokens = await this.read(this.config, 'nxf_tokens', { refresh_token: hash });
    return tokens.length ? tokens[0] : null;
  }

 async extendToken(tokenId: string, data: any) {
    const tokens = await this.read(this.config, 'nxf_tokens', { token_id: tokenId });
    if (!tokens.length) throw new Error('Token not found');

    // Convert ObjectId to string
    const id = tokens[0]._id.toString();
    await this.update(this.config, 'nxf_tokens', id, data);

    return this.read(this.config, 'nxf_tokens', { token_id: tokenId });
  }

async revokeToken(tokenId: string) {
  const tokens = await this.read(this.config, 'nxf_tokens', { token_id: tokenId });
  if (!tokens.length) return;

  // Convert ObjectId to string
  const id = tokens[0]._id.toString();
  await this.delete(this.config, 'nxf_tokens', id);
}


  // -----------------------
  // Tenant & Project
  // -----------------------
  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const tenant = {
      ten_id: crypto.randomUUID(),
      subdomain: data.subdomain,
      user_email: data.user_email,
      created_at: new Date(),
    };
    await this.create(config, 'system_tenants', tenant);
    return tenant.ten_id;
  }

  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const project = {
      project_id: crypto.randomUUID(),
      name: data.name,
      user_id: data.user_id,
      created_at: new Date(),
    };
    await this.create(config, 'system_projects', project);
    return project.project_id;
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    return (await this.read(config, 'system_projects', { user_id: ownerId }))[0] ?? null;
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    return (await this.read(config, 'system_tenants', { user_email: email }))[0] ?? null;
  }

  // -----------------------
  // Admin & User helpers
  // -----------------------
  async createAdminUser(config: DBConfig, data: any) {
    const db = await this.getDb();
    const existingUser = await db.collection('nxf_users').findOne({ user_id: data.user_id });
    if (existingUser) {
      await db.collection('nxf_users').updateOne(
        { user_id: data.user_id },
        { $set: { ...data, updated_at: new Date() } }
      );
      return data.user_id;
    }
    const hashedPassword = await this.hashPassword(data.password);
    const user = { ...data, password: hashedPassword, created_at: new Date(), user_id: data.user_id || crypto.randomUUID() };
    await db.collection('nxf_users').insertOne(user);
    return user.user_id;
  }

  async findUserByEmail(config: DBConfig, email: string) {
    const db = await this.getDb();
    return db.collection('nxf_users').findOne({ user_email: email });
  }

  // -----------------------
  // Data models
  // -----------------------
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) throw new Error('Missing DB config or projectId');
    return CreateDataModels(this, projectId);
  }

  async createDataModelsFromUserEmail(email: string) {
    const user = await this.findUserByEmail(this.config, email);
    if (!user?.user_id) throw new Error('User not found');
    const project = await this.findProjectByOwnerId(this.config, user.user_id);
    if (!project?.project_id) throw new Error('Project not found');
    return this.CreateDataModels(project.project_id);
  }

  // -----------------------
  // Storage
  // -----------------------
  async setupStorageBuckets(): Promise<string[] | { success: boolean; buckets: string[] }> {
    try {
      const db = await this.getDb();
      const DEFAULT_BUCKETS = ['uploads', 'avatars', 'products', 'reports'];
      for (const folder of DEFAULT_BUCKETS) {
        const exists = await db.collection('nxf_storage').findOne({ folder });
        if (!exists) {
          await db.collection('nxf_storage').insertOne({
            storage_id: crypto.randomUUID(),
            folder,
            file_name: '',
            file_path: folder,
            created_at: new Date(),
          });
        }
      }
      return { success: true, buckets: DEFAULT_BUCKETS };
    } catch (err: any) {
      console.error('[MongoDBAdapter] Failed to setup storage buckets:', err.message);
      return { success: false, buckets: [] };
    }
  }

  async createBucket(bucketName: string) {
    const db = await this.getDb();
    await db.collection('nxf_storage').insertOne({
      storage_id: crypto.randomUUID(),
      folder: bucketName,
      file_name: '',
      file_path: bucketName,
      created_at: new Date(),
    });
  }

  async listBuckets(): Promise<string[]> {
    const db = await this.getDb();
    const rows = await db.collection('nxf_storage').find().toArray();
    return rows.map((r) => r.folder);
  }

  async deleteBucket(bucketName: string) {
    const db = await this.getDb();
    await db.collection('nxf_storage').deleteOne({ folder: bucketName });
  }

  async createTable(tableName: string, schema?: { columns: ColumnDef[] }) {
    const db = await this.getDb();
    const exists = await db.listCollections({ name: tableName }).hasNext();
    if (!exists) await db.createCollection(tableName);
    return { collection: tableName };
  }
}

/** Factory */
export function getMongoDBAdapter(config: DBConfig) {
  if (!config?.connectionString) throw new Error('MongoDB config is undefined');
  return new MongoDBAdapter(config);
}
