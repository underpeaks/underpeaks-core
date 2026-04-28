
import { DBAdapter, DBConfig } from '../types'
import bcrypt from 'bcryptjs'
import { CreateUserDataModels } from '../utils/create-data-models'
import admin from 'firebase-admin'
import { parseFirebaseServiceAccount } from '@/app/lib/firebaseConfig';

const DEFAULT_BUCKETS = ['uploads', 'products', 'avatars', 'reports']

export class FirebaseAdapter implements DBAdapter {
  supportsBuiltInAuth = true
  firebaseAdmin: admin.app.App   // ✅ ADDED

  private firestore: admin.firestore.Firestore
  private storage: admin.storage.Storage

  constructor(private _config: DBConfig) {
  console.log('[FirebaseAdapter] 🚀 Constructor started')

  try {
    if (!_config) {
      console.error('[FirebaseAdapter] ❌ Missing DBConfig')
      throw new Error('DBConfig is required')
    }

    console.log('[FirebaseAdapter] ✅ Config received')

    if (!_config.firebaseConfigJson) {
      console.error('[FirebaseAdapter] ❌ Missing firebaseConfigJson')
      throw new Error('firebaseConfigJson is required')
    }

    // -----------------------------
    // STORAGE BUCKET RESOLUTION
    // -----------------------------
    console.log('[FirebaseAdapter] 🔍 Checking storageBucket')

    if (!_config.storageBucket) {
      console.warn('[FirebaseAdapter] ⚠️ storageBucket missing, trying fallback env')

      const publicConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

      if (!publicConfigStr) {
        console.error('[FirebaseAdapter] ❌ NEXT_PUBLIC_FIREBASE_CONFIG missing')
        throw new Error('storageBucket is required and env fallback not set')
      }

      try {
        const publicConfig = JSON.parse(publicConfigStr)
        console.log('[FirebaseAdapter] 🌐 Parsed NEXT_PUBLIC_FIREBASE_CONFIG:', publicConfig)

        if (!publicConfig.storageBucket) {
          console.error('[FirebaseAdapter] ❌ storageBucket not found in env config')
          throw new Error('storageBucket missing in env config')
        }

        _config.storageBucket = publicConfig.storageBucket

        console.log('[FirebaseAdapter] ✅ storageBucket resolved:', _config.storageBucket)
      } catch (err: any) {
        console.error('[FirebaseAdapter] ❌ Failed parsing env config:', err.message)
        throw err
      }
    } else {
      console.log('[FirebaseAdapter] ✅ storageBucket provided:', _config.storageBucket)
    }

    // -----------------------------
    // FIREBASE ADMIN INIT
    // -----------------------------
    console.log('[FirebaseAdapter] 🔧 Initializing Firebase Admin')

    let app: admin.app.App

    if (!admin.apps.length) {
      console.log('[FirebaseAdapter] 🆕 No existing Firebase app found, creating new one')

      let rawConfig: any

      console.log('[FirebaseAdapter] 📦 Raw firebaseConfigJson type:', typeof _config.firebaseConfigJson)

      if (typeof _config.firebaseConfigJson === 'string') {
        try {
          console.log('[FirebaseAdapter] 🧪 Parsing service account JSON')

          rawConfig = parseFirebaseServiceAccount(_config.firebaseConfigJson)

          console.log('[FirebaseAdapter] ✅ Parsed service account:', {
            project_id: rawConfig?.project_id,
            client_email: rawConfig?.client_email,
          })
        } catch (err: any) {
          console.error('[FirebaseAdapter] ❌ Service account parse failed:', err.message)
          throw new Error('firebaseConfigJson is not valid JSON')
        }
      } else {
        rawConfig = _config.firebaseConfigJson
        console.log('[FirebaseAdapter] 📦 Using object config directly')
      }

      if (!rawConfig.private_key) {
        console.error('[FirebaseAdapter] ❌ Missing private_key')
        throw new Error('private_key missing in firebaseConfigJson')
      }

      const serviceAccount: admin.ServiceAccount = {
        ...rawConfig,
        private_key: rawConfig.private_key.replace(/\\n/g, '\n'),
      }

      console.log('[FirebaseAdapter] 🔐 Initializing Firebase app...')

      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: _config.storageBucket,
      })

      console.log('[FirebaseAdapter] ✅ Firebase Admin initialized')
    } else {
      console.log('[FirebaseAdapter] ♻️ Reusing existing Firebase app')
      app = admin.app()
    }

    this.firebaseAdmin = app

    // -----------------------------
    // FIRESTORE INIT
    // -----------------------------
    console.log('[FirebaseAdapter] 🧱 Initializing Firestore')

    this.firestore = this.firebaseAdmin.firestore()

    try {
      this.firestore.settings({
        ignoreUndefinedProperties: true,
      })

      console.log('[FirebaseAdapter] ✅ Firestore settings applied')
    } catch (err: any) {
      console.warn('[FirebaseAdapter] ⚠️ Firestore settings warning:', err.message)
    }

    // -----------------------------
    // STORAGE INIT
    // -----------------------------
    console.log('[FirebaseAdapter] 🪣 Initializing Storage')

    this.storage = this.firebaseAdmin.storage()

    console.log('[FirebaseAdapter] 🎉 Constructor completed successfully')
  } catch (err: any) {
    console.error('[FirebaseAdapter] 💥 Constructor FAILED:', err.message)
    throw err
  }
}

 getFirestoreInstance() {
  return admin.firestore()
}

  get config(): DBConfig {
    return this._config
  }

  async testConnection() {
    try {
      await this.firestore.listCollections()
      return { success: true, message: 'Connected to Firebase Firestore' }
    } catch (err: any) {
      return { success: false, message: `Failed to connect to Firebase: ${err.message}` }
    }
  }

  async getUserById(uid: string): Promise<{ user?: any; error?: string }> {
  try {
    if (!uid) {
      return { error: 'UID is required' }
    }

    const doc = await this.firestore.collection('nxf_users').doc(uid).get()

    if (!doc.exists) {
      return { error: 'User not found' }
    }

    return { user: doc.data() }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch user' }
  }
}

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

  async registerUserInAuth(
    config: DBConfig,
    data: { email: string; password: string; full_name: string; notes?: string }
  ) {
    if (!data.email) throw new Error('Email is required');
    if (!data.password) throw new Error('Password is required');
    if (!data.full_name) throw new Error('Full Name is required');

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(data.email);
      throw new Error('User already exists in Firebase Auth');
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') {
        throw err;
      }
    }

    userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.full_name,
    });

    const hashedPassword = await this.hashPassword(data.password);

    await this.firestore.collection('nxf_users').doc(userRecord.uid).set({
      user_id: userRecord.uid,
      user_email: data.email,
      full_name: data.full_name,
      password_hash: hashedPassword,
      role: 'admin',
      status: 'active',
      notes: data.notes || '',
      email_verified: true,
      token: null,
      token_ttl: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { id: userRecord.uid };
  }

  async registerUser(
    config: DBConfig,
    data: { email: string; password: string; full_name: string; notes?: string }
  ): Promise<{ userId?: string; error?: string }> {
    try {
      if (!data.email) throw new Error('Email is required')
      if (!data.password) throw new Error('Password is required')
      if (!data.full_name) throw new Error('Full Name is required')

      let userRecord
      try {
        userRecord = await admin.auth().getUserByEmail(data.email)
        return { error: 'User already exists in Firebase Auth' }
      } catch (err: any) {
        if (err.code !== 'auth/user-not-found') {
          throw err
        }
      }

       let userRec = await admin.auth().createUser({
        email: data.email,
        password: data.password,
        displayName: data.full_name,
      })

      const hashedPassword = await this.hashPassword(data.password)

      await this.firestore.collection('nxf_users').doc(userRec.uid).set({
        user_id: userRec.uid,
        user_email: data.email,
        full_name: data.full_name,
        password_hash: hashedPassword,
        role: 'user',
        status: 'active',
        notes: data.notes || '',
        email_verified: false,
        token: null,
        token_ttl: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      

      return { userId: userRec.uid }
    } catch (err: any) {
      console.error('registerUser error:', err)
      return { error: err.message || 'Registration failed' }
    }
  }

  async syncAuthUserToDatabase(
    config: DBConfig,
    user: { uid: string; email: string; full_name: string; notes?: string }
  ) {
    if (!user?.uid) throw new Error('User UID is required')
    if (!user.full_name) throw new Error('Full name is required')

    const docRef = this.firestore.collection('nxf_users').doc(user.uid)
    const existing = await docRef.get()

    if (!existing.exists) {
      await docRef.set({
        user_id: user.uid,
        user_email: user.email || '',
        full_name: user.full_name,
        role: 'user',
        status: 'active',
        notes: user.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } else {
      await docRef.update({
        user_email: user.email || '',
        full_name: user.full_name,
        updated_at: new Date().toISOString(),
      })
    }

    return user.uid
  }

  async createAdminUser(
    config: DBConfig,
    data: { user_id: string; user_email: string; full_name: string; password: string; role: string; notes?: string }
  ) {
    if (!data.user_email) throw new Error('Admin Email is required')
    if (!data.password) throw new Error('Admin Password is required')
    if (!data.full_name) throw new Error('Admin Full Name is required')

    const hashedPassword = await this.hashPassword(data.password)

    await this.firestore.collection('nxf_users').doc(data.user_id).set({
      user_id: data.user_id,
      user_email: data.user_email,
      full_name: data.full_name,
      password_hash: hashedPassword,
      role: data.role || 'admin',
      status: 'active',
      notes: data.notes || '',
      email_verified: true,
      token: null,
      token_ttl: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    try {
      await admin.auth().createUser({
        uid: data.user_id,
        email: data.user_email,
        password: data.password,
        displayName: data.full_name,
      })
    } catch (err: any) {
      console.warn('⚠️ Firebase Auth admin user creation failed:', err.message)
    }

    return data.user_id
  }

  async findUserByEmail(config: DBConfig, email: string) {
    if (!email) return null
    const snapshot = await this.firestore.collection('nxf_users').where('user_email', '==', email).limit(1).get()
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

  async sendResetEmail(config: DBConfig, email: string, redirectUrl?: string) {
    if (!email) throw new Error('Email is required')
    if (!redirectUrl) throw new Error('Redirect URL is required')

    const link = await admin.auth().generatePasswordResetLink(email, { url: redirectUrl })
    console.log('🔗 Firebase password reset link:', link)
    return { success: true }
  }

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
    const snapshot = await this.firestore.collection('nxf_system_projects').where('user_id', '==', ownerId).limit(1).get()
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
    const snapshot = await this.firestore.collection('nxf_system_tenants').where('user_email', '==', email).limit(1).get()
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  async CreateDataModels(projectId: string,selectedProjectType: string) {
    if (!this.config || !projectId) throw new Error('Missing DB config or projectId')
    return CreateUserDataModels(this, projectId,selectedProjectType,[])
  }

  async createDataModelsFromUserEmail(email: string,selectedProjectType: string) {
    if (!email) throw new Error('Missing User Email');

    const user = await this.findUserByEmail(this.config, email);
    if (!user?.id) throw new Error('User not found');

    const project = await this.findProjectByOwnerId(this.config, user.id);
    if (!project?.id) throw new Error('Project not found');

    const db = this.getFirestoreInstance();

    const modelsCollection = db.collection(`projects/${project.id}/models`);
   // const snapshot = await modelsCollection.limit(1).get();

    // if (!snapshot.empty) {
    //   return {
    //     skipped: true,
    //     message: 'Data models already exist for this project, skipping.',
    //   };
    // }

    const result = await this.CreateDataModels(project.id,selectedProjectType);
    return {
      skipped: false,
      message: 'Data models inserted successfully',
      data: result,
    };
  }

  async createTable(tableName: string) {
    console.log(`[FirebaseAdapter] Skipping createTable for ${tableName} (Firestore has no tables)`)
    return true
  }

  async findUserByEmailWithRetry(config: DBConfig, email: string, retries = 3, delayMs = 1000) {
    let lastError: any
    for (let i = 0; i < retries; i++) {
      try {
        const user = await this.findUserByEmail(config, email)
        return user
      } catch (err) {
        lastError = err
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
    throw lastError
  }

  async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
    const retries = 10
    const delayMs = 5000
    let bucketName = this._config.storageBucket
    if (!bucketName) throw new Error('[FirebaseAdapter] storageBucket is required')
    bucketName = bucketName.replace(/^gs:\/\//, '').split('/')[0]
    const bucket = this.storage.bucket(bucketName)
    for (let i = 0; i < retries; i++) {
      try {
        for (const folder of DEFAULT_BUCKETS) {
          await bucket.file(`${folder}/.keep`).save('', { resumable: false, contentType: 'text/plain' })
        }
        return { success: true, buckets: DEFAULT_BUCKETS }
      } catch (err: any) {
        console.error(`[FirebaseAdapter][Storage] Attempt ${i + 1} failed:`, err?.message || err)
        if (i === retries - 1) throw new Error(`Failed to setup Firebase Storage: ${err?.message || err}`)
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
    throw new Error('Unexpected storage setup failure')
  }

  async validateBuiltInSession(config: DBConfig, token: string) {
    try {
      return await admin.auth().verifyIdToken(token)
    } catch {
      return null
    }
  }

  async login() {
    return { error: 'login() via Firebase Admin SDK not supported. Use client SDK and pass ID token.' }
  }

  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    if (!data.project_id) throw new Error('project_id is required')
    const docRef = await this.firestore.collection('nxf_system_config').add({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return docRef.id
  }

 async installDemoContent(
  config: DBConfig,
  selectedProjectType: string
): Promise<{
  success: boolean;
  error?: string;
  inserted?: number;
  skipped?: boolean;
}> {
  const fs = require("fs");
  const path = require("path");

  try {
    const modelFolders = [
      `${selectedProjectType}_models`,
      "system_models",
      "users_models",
    ];

    const basePaths = modelFolders.map((folder) =>
      path.resolve(process.cwd(), "..", "demo_content", folder)
    );

    let totalInserted = 0;

    for (const basePath of basePaths) {
      console.log("CHECKING PATH =", basePath);

      if (!fs.existsSync(basePath)) {
        console.log("SKIP (missing folder):", basePath);
        continue;
      }

      const files = fs
        .readdirSync(basePath)
        .filter((f: string) => f.endsWith(".json"));

      for (const file of files) {
        const fullPath = path.join(basePath, file);

        console.log("Reading file:", fullPath);

        const raw = fs.readFileSync(fullPath, "utf-8");

        let json: any;

        try {
          json = JSON.parse(raw);
        } catch (e: any) {
          console.log(`INVALID JSON: ${file}`, e.message);
          continue;
        }

        const collectionName = file.replace(".json", "");

        const rows = Array.isArray(json) ? json : json?.demo_data;

        if (!rows || !Array.isArray(rows)) {
          console.log(`SKIPPING ${file} (no valid data array)`);
          continue;
        }

        console.log(`INSTALLING ${collectionName} -> ${rows.length} docs`);

        const collectionRef = this.firestore.collection(collectionName);
        const batch = this.firestore.batch();

        let count = 0;

        for (const row of rows) {
          try {
            const id =
              row.id ||
              row._id ||
              row[`${collectionName.slice(0, -1)}_id`] ||
              this.firestore.collection("_tmp").doc().id;

            const docRef = collectionRef.doc(id);

            batch.set(docRef, {
              ...row,
              created_at: row.created_at || new Date().toISOString(),
              updated_at: row.updated_at || new Date().toISOString(),
            });

            count++;
            totalInserted++;
          } catch (err: any) {
            console.log(`FAILED PREP ${collectionName}:`, err.message);
          }
        }

        if (count > 0) {
          await batch.commit();
        }
      }
    }

    return {
      success: true,
      inserted: totalInserted,
    };
  } catch (err: any) {
    console.error("FIREBASE DEMO INSTALL ERROR:", err);

    return {
      success: false,
      inserted: 0,
      error: err?.message || "Failed to install demo content",
    };
  }
}
// Add this method to FirebaseAdapter class

async findSystemConfigByUserId(config: DBConfig, userId: string) {
  console.log("FIREBASE ADAPTER - [LOOKING UP USER]")
  if (!userId) return null
console.log("FIREBASE ADAPTER - [LOOKING UP CONFIG]")
  const snapshot = await this.firestore
    .collection('nxf_system_config')
    .where('user_id', '==', userId)
    .limit(1)
    .get()
  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  console.log("FIREBASE ADAPTER - [RETURNING CONFIG]")
  return { id: doc.id, ...doc.data() }
}
}
export function getFirebaseAdapter(config: DBConfig) {
  if (!config) throw new Error('Firebase config is required')
  return new FirebaseAdapter(config)
}
