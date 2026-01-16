import admin from 'firebase-admin'
import { DBAdapter, DBConfig } from '../types'
import bcrypt from 'bcryptjs'
import { CreateDataModels } from '../utils/create-data-models'

const DEFAULT_BUCKETS = ['uploads', 'products', 'avatars', 'reports']

export class FirebaseAdapter implements DBAdapter {
  supportsBuiltInAuth = true

  private firestore: admin.firestore.Firestore
  private storage: admin.storage.Storage

  constructor(private _config: DBConfig) {
    if (!this._config) {
      throw new Error('[FirebaseAdapter] DBConfig is required')
    }

    if (!this._config.firebaseConfigJson) {
      throw new Error('[FirebaseAdapter] firebaseConfigJson is required')
    }

    if (!this._config.storageBucket) {
      throw new Error('[FirebaseAdapter] storageBucket is required (gs://...)')
    }

    // -----------------------------
    // INIT FIREBASE ADMIN (ONCE)
    // -----------------------------
    if (!admin.apps.length) {
      const rawConfig =
        typeof this._config.firebaseConfigJson === 'string'
          ? JSON.parse(this._config.firebaseConfigJson)
          : this._config.firebaseConfigJson

      if (!rawConfig.private_key) {
        throw new Error('[FirebaseAdapter] private_key missing in firebaseConfigJson')
      }

      const fixedConfig: admin.ServiceAccount = {
        ...rawConfig,
        private_key: rawConfig.private_key.replace(/\\n/g, '\n'),
      }

      admin.initializeApp({
        credential: admin.credential.cert(fixedConfig),
        storageBucket: this._config.storageBucket,
      })
    }

    this.firestore = admin.firestore()

    // Firestore settings must only be applied once
    try {
      this.firestore.settings({ ignoreUndefinedProperties: true })
    } catch (err: any) {
      if (!err.message.includes('already been initialized')) {
        throw err
      }
    }

    this.storage = admin.storage()
  }

  get config(): DBConfig {
    return this._config
  }

  // -----------------------------
  // CONNECTION
  // -----------------------------
  async testConnection() {
    try {
      await this.firestore.listCollections()
      return { success: true, message: 'Connected to Firebase Firestore' }
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Firebase: ${err.message}`,
      }
    }
  }

  // -----------------------------
  // CRUD
  // -----------------------------
  async create(config: DBConfig, collection: string, data: any): Promise<string> {
    const docRef = await this.firestore.collection(collection).add(data)
    return docRef.id
  }

  async read(config: DBConfig, collection: string) {
    const snapshot = await this.firestore.collection(collection).get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  async update(config: DBConfig, collection: string, id: string, data: any) {
    await this.firestore.collection(collection).doc(id).update(data)
    return true
  }

  async delete(config: DBConfig, collection: string, id: string) {
    await this.firestore.collection(collection).doc(id).delete()
    return true
  }

  // -----------------------------
  // AUTH & USERS
  // -----------------------------
  async registerUserInAuth(config: DBConfig, data: { email: string; password: string }) {
    if (!data.email || !data.password) {
      throw new Error('Email and password required')
    }

    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
    })

    return { id: userRecord.uid }
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
    const hashedPassword = await this.hashPassword(data.password || '')

    await this.firestore.collection('nxf_users').doc(data.user_id).set({
      uid: data.user_id,
      email: data.user_email || '',
      full_name: data.full_name || '',
      password_hash: hashedPassword,
      role: data.role || 'admin',
      created_at: new Date().toISOString(),
    })

    return data.user_id
  }

  async findUserByEmail(config: DBConfig, email: string) {
    if (!email) return null

    const snapshot = await this.firestore
      .collection('nxf_users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  // -----------------------------
  // PROJECTS & TENANTS
  // -----------------------------
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const docRef = await this.firestore.collection('nxf_system_projects').add({
      name: data.name || 'defaultproject',
      user_id: data.user_id || '',
      created_at: new Date().toISOString(),
    })

    return docRef.id
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    if (!ownerId) return null

    const snapshot = await this.firestore
      .collection('nxf_system_projects')
      .where('user_id', '==', ownerId)
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const docRef = await this.firestore.collection('nxf_system_tenants').add({
      subdomain: data.subdomain || 'console',
      user_email: data.user_email || '',
      created_at: new Date().toISOString(),
    })

    return docRef.id
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    if (!email) return null

    const snapshot = await this.firestore
      .collection('nxf_system_tenants')
      .where('user_email', '==', email)
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

  // -----------------------------
  // DATA MODELS
  // -----------------------------
  async CreateDataModels(projectId: string) {
    if (!this.config || !projectId) {
      throw new Error('Missing DB config or projectId')
    }
    return CreateDataModels(this, projectId)
  }

  async createDataModelsFromUserEmail(email: string) {
    if (!email) throw new Error('Missing User Email')

    const user = await this.findUserByEmail(this.config, email)
    if (!user?.id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.id)
    if (!project?.id) throw new Error('Project not found')

    return this.CreateDataModels(project.id)
  }

  async createTable(tableName: string) {
    console.log(
      `[FirebaseAdapter] Skipping createTable for ${tableName} (Firestore has no tables)`
    )
    return true
  }

 // -----------------------------
// RETRY WRAPPER
// -----------------------------
async findUserByEmailWithRetry(
  config: DBConfig,
  email: string,
  retries = 3,
  delayMs = 1000
) {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const user = await this.findUserByEmail(config, email);
      return user;
    } catch (err) {
      lastError = err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw lastError;
}

 // -----------------------------
// STORAGE
// -----------------------------
async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
  const retries = 10
  const delayMs = 5000

  // Use the default bucket from initializeApp
  // If the user pasted "gs://..." we strip it internally
  let bucketName = this._config.storageBucket
  if (!bucketName) {
    throw new Error('[FirebaseAdapter] storageBucket is required')
  }
  bucketName = bucketName.replace(/^gs:\/\//, '').split('/')[0]

  const bucket = this.storage.bucket(bucketName)

  for (let i = 0; i < retries; i++) {
    try {
      // Create "folders" by writing a .keep file
      for (const folder of DEFAULT_BUCKETS) {
        await bucket.file(`${folder}/.keep`).save('', {
          resumable: false,
          contentType: 'text/plain',
        })
      }

      return { success: true, buckets: DEFAULT_BUCKETS }
    } catch (err: any) {
      console.error(
        `[FirebaseAdapter][Storage] Attempt ${i + 1} failed:`,
        err?.message || err
      )

      if (i === retries - 1) {
        throw new Error(
          `Failed to setup Firebase Storage: ${err?.message || err}`
        )
      }

      // wait before retrying
      await new Promise((res) => setTimeout(res, delayMs))
    }
  }

  // Should never reach here, but satisfies TS exhaustiveness
  throw new Error('Unexpected storage setup failure')
}




  // -----------------------------
  // BUILT-IN AUTH
  // -----------------------------
  async signUpWithEmailPassword(
    config: DBConfig,
    email: string,
    password: string,
    fullName?: string
  ) {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    })
    return { uid: userRecord.uid }
  }

  async validateBuiltInSession(config: DBConfig, token: string) {
    try {
      return await admin.auth().verifyIdToken(token)
    } catch {
      return null
    }
  }

  async login() {
    return {
      error:
        'login() via Firebase Admin SDK not supported. Use client SDK and pass ID token.',
    }
  }

  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
  if (!data.project_id) {
    throw new Error('project_id is required');
  }

  const docRef = await this.firestore
    .collection('nxf_system_config')
    .add({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  return docRef.id;
}


}
