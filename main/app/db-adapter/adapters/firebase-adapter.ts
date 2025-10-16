import admin from 'firebase-admin';
import { DBAdapter, DBConfig } from '../types';
import bcrypt from 'bcryptjs';
import { CreateDataModels } from '../utils/create-data-models';


const DEFAULT_BUCKETS = ['uploads', 'products', 'avatars', 'reports'];

export class FirebaseAdapter implements DBAdapter {
  private firestore: admin.firestore.Firestore;
  private storage: admin.storage.Storage;

  constructor(private _config: DBConfig) {
    if (!admin.apps.length) {
      if (!_config.firebaseConfigJson) {
        throw new Error('Firebase config JSON is required');
      }

      const firebaseConfig =
        typeof _config.firebaseConfigJson === 'string'
          ? JSON.parse(_config.firebaseConfigJson)
          : _config.firebaseConfigJson;

      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
        storageBucket: firebaseConfig.storageBucket, // required for storage
      });

      this.firestore = admin.firestore();
      this.firestore.settings({ ignoreUndefinedProperties: true });
      this.storage = admin.storage();
    } else {
      this.firestore = admin.firestore();
      this.storage = admin.storage();
    }
  }

  // Public getter to expose config
  get config(): DBConfig {
    return this._config;
  }

  async testConnection() {
    try {
      await this.firestore.listCollections();
      return { success: true, message: 'Connected to Firebase Firestore' };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Firebase: ${err.message}`,
      };
    }
  }

  async create(config: DBConfig, collection: string, data: any): Promise<string> {
    const docRef = await this.firestore.collection(collection).add(data);
    return docRef.id;
  }

  async read(config: DBConfig, collection: string, query: any = {}) {
    const snapshot = await this.firestore.collection(collection).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async update(config: DBConfig, collection: string, id: string, data: any) {
    await this.firestore.collection(collection).doc(id).update(data);
    return true;
  }

  async delete(config: DBConfig, collection: string, id: string) {
    await this.firestore.collection(collection).doc(id).delete();
    return true;
  }

  // -----------------------------
  // Auth & Users
  // -----------------------------
  async registerUserInAuth(config: DBConfig, data: { email: string; password: string }) {
    if (!data.email || !data.password) throw new Error('Email and password required');

    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
    });

    return { id: userRecord.uid };
  }

  async createAdminUser(config: DBConfig, data: {
    user_id: string;
    user_email: string;
    full_name: string;
    password: string;
    role: string;
  }) {
    const hashedPassword = await this.hashPassword(data.password || '');

    await this.firestore.collection('nxf_users').doc(data.user_id).set({
      uid: data.user_id,
      email: data.user_email || '',
      full_name: data.full_name || '',
      password_hash: hashedPassword,
      role: data.role || 'admin',
      created_at: new Date().toISOString(),
    });

    return data.user_id;
  }

  async findUserByEmail(config: DBConfig, email: string) {
    if (!email) return null;

    const snapshot = await this.firestore
      .collection('nxf_users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  // -----------------------------
  // Projects & Tenants
  // -----------------------------
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const docRef = await this.firestore.collection('nxf_system_projects').add({
      name: data.name || 'defaultproject',
      user_id: data.user_id || '',
      created_at: new Date().toISOString(),
    });

    return docRef.id;
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    if (!ownerId) return null;

    const snapshot = await this.firestore
      .collection('nxf_system_projects')
      .where('user_id', '==', ownerId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const docRef = await this.firestore.collection('nxf_system_tenants').add({
      subdomain: data.subdomain || 'console',
      user_email: data.user_email || '',
      created_at: new Date().toISOString(),
    });

    return docRef.id;
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    if (!email) return null;

    const snapshot = await this.firestore
      .collection('nxf_system_tenants')
      .where('user_email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }

  // -----------------------------
  // Data Models
  // -----------------------------
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) {
      throw new Error('Missing DB config or projectId');
    }
    return CreateDataModels(this, projectId);
  }

  async createDataModelsFromUserEmail(email: string): Promise<any> {
    if (!this.config) {
      throw new Error('Missing DB config');
    }
    if (!email) {
      throw new Error('Missing User Email');
    }

    const user = await this.findUserByEmail(this.config, email);
    if (!user?.id) throw new Error('User not found');

    const project = await this.findProjectByOwnerId(this.config, user.id);
    if (!project?.id) throw new Error('Project not found');

    return this.CreateDataModels(project.id);
  }


  async createTable(tableName: string, schema: any) {
  console.log(`[FirebaseAdapter] Skipping createTable for ${tableName} (Firestore does not have tables)`);
  return true;
}
  // -----------------------------
  // Firebase Storage
  // -----------------------------
 
async setupStorageBuckets(retries = 10, delayMs = 5000) {
  if (!this._config.firebaseConfigJson) {
    throw new Error('Firebase config JSON is required for storage setup');
  }

  const firebaseConfig =
    typeof this._config.firebaseConfigJson === 'string'
      ? JSON.parse(this._config.firebaseConfigJson)
      : this._config.firebaseConfigJson;

  // Removed storageBucket check to simplify setup for users

  const bucket = this.storage.bucket(firebaseConfig.storageBucket);

  for (let i = 0; i < retries; i++) {
    try {
      for (const folder of DEFAULT_BUCKETS) {
        const file = bucket.file(`${folder}/.keep`);
        await file.save('', { resumable: false }); // placeholder file
        console.log(`[FirebaseAdapter] Created storage folder: ${folder}/`);
      }
      return { success: true, buckets: DEFAULT_BUCKETS };
    } catch (err: any) {
      console.log(`[FirebaseAdapter] Storage not ready, retrying in ${delayMs / 1000}s...`, err.message);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  throw new Error('Firebase Storage was not enabled after waiting.');
}
}