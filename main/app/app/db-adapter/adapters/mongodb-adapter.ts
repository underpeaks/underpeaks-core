// lib/db-adapter/adapters/mongodb-adapter.ts
import { MongoClient, Db, ObjectId } from 'mongodb';
import { DBAdapter, DBConfig } from '../types';

export class MongoDBAdapter implements DBAdapter {
  private client: MongoClient;
  private db?: Db;

  constructor(private config: DBConfig) {
    if (!config.connectionString) {
      throw new Error('MongoDB connection string is required');
    }
    this.client = new MongoClient(config.connectionString);
  }

  private async getDb() {
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
      await this.client.close();
      return { success: true, message: 'Connected to MongoDB successfully.' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to connect to MongoDB.' };
    }
  }

  async create(config: DBConfig, collection: string, data: any): Promise<any> {
    const db = await this.getDb();
    const result = await db.collection(collection).insertOne(data);
    return result.insertedId;
  }

  async read(config: DBConfig, collection: string, query: any = {}): Promise<any> {
    const db = await this.getDb();
    const cursor = db.collection(collection).find(query);
    return cursor.toArray();
  }

  async update(config: DBConfig, collection: string, id: string, data: any): Promise<any> {
    const db = await this.getDb();
    const result = await db.collection(collection).updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return result.modifiedCount > 0;
  }

  async delete(config: DBConfig, collection: string, id: string): Promise<any> {
    const db = await this.getDb();
    const result = await db.collection(collection).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
