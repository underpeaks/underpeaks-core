// lib/db-adapter/adapters/firebase-adapter.ts
import admin from 'firebase-admin';
import { DBAdapter, DBConfig } from '../types';

export class FirebaseAdapter implements DBAdapter {
  private firestore: admin.firestore.Firestore;

  constructor(private config: DBConfig) {
    if (!admin.apps.length) {
      if (!config.firebaseConfigJson) {
        throw new Error('Firebase config JSON is required');
      }
      // Parse config JSON if it is a string
      const firebaseConfig = typeof config.firebaseConfigJson === 'string'
        ? JSON.parse(config.firebaseConfigJson)
        : config.firebaseConfigJson;

      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      });
    }

    this.firestore = admin.firestore();
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to get some collections as a simple test
      await this.firestore.listCollections();
      return { success: true, message: 'Connected to Firebase Firestore successfully.' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to connect to Firebase Firestore.' };
    }
  }

  async create(config: DBConfig, collection: string, data: any): Promise<any> {
    const docRef = await this.firestore.collection(collection).add(data);
    return docRef.id;
  }

  async read(config: DBConfig, collection: string, query: any = {}): Promise<any> {
    // Note: Firestore queries can be complex; this example assumes no query filters.
    // You can extend this to support where clauses etc.
    const snapshot = await this.firestore.collection(collection).get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs;
  }

  async update(config: DBConfig, collection: string, id: string, data: any): Promise<any> {
    await this.firestore.collection(collection).doc(id).update(data);
    return true;
  }

  async delete(config: DBConfig, collection: string, id: string): Promise<any> {
    await this.firestore.collection(collection).doc(id).delete();
    return true;
  }
}
