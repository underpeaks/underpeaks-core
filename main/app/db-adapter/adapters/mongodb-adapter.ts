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
    if (!config.connectionString) {
      throw new Error('MongoDB connection string is required');
    }
    this._config = config;
    this.client = new MongoClient(config.connectionString);
  }

  // ✅ Public getter for config (fixes TS compatibility issue)
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
    } catch (error: any) {
      return { success: false, message: error?.message ?? 'Failed to connect to MongoDB.' };
    } finally {
      try {
        await this.client.close();
      } catch {
        /* ignore close errors */
      }
    }
  }

  /** Generic CRUD methods **/
  async create(config: DBConfig, collection: string, data: any): Promise<any> {
    const db = await this.getDb();
    const result = await db.collection<any>(collection).insertOne(data as any);
    return result.insertedId?.toString();
  }

  async read(config: DBConfig, collection: string, query: any = {}): Promise<any> {
    const db = await this.getDb();
    const cursor = db.collection<any>(collection).find(query);
    return cursor.toArray();
  }

  async update(config: DBConfig, collection: string, id: string, data: any): Promise<any> {
    const db = await this.getDb();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await db.collection<any>(collection).updateOne(filter as any, { $set: data });
    return result.modifiedCount > 0;
  }

  async delete(config: DBConfig, collection: string, id: string): Promise<any> {
    const db = await this.getDb();
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    const result = await db.collection<any>(collection).deleteOne(filter as any);
    return result.deletedCount > 0;
  }

  /** Installer-specific helpers **/
  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const db = await this.getDb();
    const tenant = {
      ten_id: crypto.randomUUID(),
      subdomain: data.subdomain,
      user_email: data.user_email,
      created_at: new Date(),
    };
    await db.collection<any>('system_tenants').insertOne(tenant as any);
    return tenant.ten_id;
  }

  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const db = await this.getDb();
    const project = {
      project_id: crypto.randomUUID(),
      name: data.name,
      user_id: data.user_id,
      created_at: new Date(),
    };
    await db.collection<any>('system_projects').insertOne(project as any);
    return project.project_id;
  }

  async registerUserInAuth(config: DBConfig, data: { email: string; password: string }) {
    const db = await this.getDb();
    const hashedPassword = await this.hashPassword(data.password);
    const user = {
      user_id: crypto.randomUUID(),
      user_email: data.email,
      password: hashedPassword,
      created_at: new Date(),
    };
    await db.collection<any>('nxf_users').insertOne(user as any);
    return { id: user.user_id };
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async createAdminUser(config: DBConfig, data: any) {
    const db = await this.getDb();

    const existingUser = await db.collection('nxf_users').findOne({ user_id: data.user_id });

    if (existingUser) {
      await db.collection('nxf_users').updateOne(
        { user_id: data.user_id },
        {
          $set: {
            user_email: data.user_email,
            password: data.password,
            tenant_id: data.ten_id,
            project_id: data.project_id,
            role: data.role || 'admin',
            updated_at: new Date(),
            ...data,
          },
        }
      );
      return data.user_id;
    } else {
      const adminUser = {
        user_id: data.user_id || crypto.randomUUID(),
        user_email: data.user_email,
        password: data.password,
        tenant_id: data.ten_id,
        project_id: data.project_id,
        role: data.role || 'admin',
        created_at: new Date(),
        ...data,
      };
      await db.collection('nxf_users').insertOne(adminUser);
      return adminUser.user_id;
    }
  }

  /** Finder helpers **/
  async findUserByEmail(config: DBConfig, user_email: string) {
    const db = await this.getDb();
    return db.collection('nxf_users').findOne({ user_email });
  }

  async findProjectByOwnerId(config: DBConfig, user_Id: string) {
    const db = await this.getDb();
    return db.collection('system_projects').findOne({ user_id: user_Id });
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    const db = await this.getDb();
    return db.collection('system_tenants').findOne({ user_email: email });
  }

  /** Data models **/
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) {
      throw new Error('Missing DB config or projectId');
    }
    return CreateDataModels(this, projectId);
  }

  async createDataModelsFromUserEmail(email: string): Promise<any> {
    if (!this.config) throw new Error('Missing DB config');
    if (!email) throw new Error('Missing User Email');

    const user = await this.findUserByEmail(this.config, email);
    if (!user?.user_id) throw new Error('User not found');

    const project = await this.findProjectByOwnerId(this.config, user.user_id);
    if (!project?.project_id) throw new Error('Project not found');

    return this.CreateDataModels(project.project_id);
  }

  /** ✅ Added for compatibility with SQL-based adapters */
  async createTable(tableName: string, schema: { columns: ColumnDef[]; schema?: string }) {
    const db = await this.getDb();
    // Mongo just creates collections, schema enforcement is minimal
    const exists = await db.listCollections({ name: tableName }).hasNext();
    if (!exists) {
      await db.createCollection(tableName);
    }
    return { collection: tableName };
  }
   // -----------------------
  // STORAGE ADAPTER (MongoDB)
  // -----------------------
  async setupStorageBuckets(): Promise<string[] | { success: boolean; buckets: string[] }> {
    try {
      const db = await this.getDb();
      const DEFAULT_BUCKETS = ['uploads', 'avatars', 'products', 'reports'];

      for (const folder of DEFAULT_BUCKETS) {
        const existing = await db.collection('nxf_storage').findOne({ folder });

        if (!existing) {
          await db.collection('nxf_storage').insertOne({
            storage_id: crypto.randomUUID(),
            folder,
            file_name: '',
            file_path: folder,
            created_at: new Date(),
          });

          console.log(`[MongoDBAdapter] Created storage folder record: ${folder}`);
        }
      }

      return { success: true, buckets: DEFAULT_BUCKETS };
    } catch (err: any) {
      console.error('[MongoDBAdapter] Failed to setup storage buckets:', err.message);
      return { success: false, buckets: [] };
    }
  }
}



/** Factory */
export function getMongoDBAdapter(config: DBConfig) {
  if (!config?.connectionString) throw new Error('MongoDB config is undefined');
  return new MongoDBAdapter(config);
}
