// lib/db-adapter/adapters/mongodb-adapter.ts
import { MongoClient, Db, ObjectId } from 'mongodb';
import { DBAdapter, DBConfig } from '../types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class MongoDBAdapter implements DBAdapter {
  private client: MongoClient;
  private db?: Db;

  constructor(private config: DBConfig) {
    if (!config.connectionString) {
      throw new Error('MongoDB connection string is required');
    }
    this.client = new MongoClient(config.connectionString);
  }

  private async getDb(): Promise<Db> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.config.database);
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
    // Insert using any-typed collection to avoid strict _id typing issues
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

  /** Installer-specific helpers (tenant/project/user creation) **/

  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const db = await this.getDb();
    const tenant = {
      _id: crypto.randomUUID(), // use string UUID (keeps parity with Firebase)
      subdomain: data.subdomain,
      user_email: data.user_email,
      created_at: new Date(),
    };
    await db.collection<any>('system_tenants').insertOne(tenant as any);
    return tenant._id;
  }

  async createProject(config: DBConfig, data: { name: string; owner_id: string }) {
    const db = await this.getDb();
    const project = {
      _id: crypto.randomUUID(),
      name: data.name,
      owner_id: data.owner_id,
      created_at: new Date(),
    };
    await db.collection<any>('system_projects').insertOne(project as any);
    return project._id;
  }

  async registerUserInAuth(config: DBConfig, data: { email: string; password: string }) {
    const db = await this.getDb();
    const hashedPassword = await this.hashPassword(data.password);
    const user = {
      _id: crypto.randomUUID(),
      email: data.email,
      password: hashedPassword,
      created_at: new Date(),
    };
    await db.collection<any>('users').insertOne(user as any);
    return { id: user._id };
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async createAdminUser(config: DBConfig, data: any) {
  const db = await this.getDb();

  // Check if user already exists by _id
  const existingUser = await db.collection('users').findOne({ _id: data.id });

  if (existingUser) {
    // Update existing user document
    await db.collection('users').updateOne(
      { _id: data.id },
      {
        $set: {
          email: data.email,
          password: data.password,
          tenant_id: data.tenant_id,
          project_id: data.project_id,
          role: data.role || 'admin',
          updated_at: new Date(),
          ...data,
        },
      }
    );
    return data.id;
  } else {
    // Insert new user document
    const adminUser = {
      _id: data.id || crypto.randomUUID(),
      email: data.email,
      password: data.password,
      tenant_id: data.tenant_id,
      project_id: data.project_id,
      role: data.role || 'admin',
      created_at: new Date(),
      ...data,
    };
    await db.collection('users').insertOne(adminUser);
    return adminUser._id;
  }
}

}
