import { DBAdapter, DBConfig, StorageFile } from '../types'
import bcrypt from 'bcryptjs'
import { CreateUserDataModels } from '../utils/create-data-models'
import admin from 'firebase-admin'
import { parseFirebaseServiceAccount } from '@/app/lib/firebaseConfig'

const DEFAULT_BUCKETS = ['uploads', 'products', 'avatars', 'reports']

export class FirebaseAdapter implements DBAdapter {
  supportsBuiltInAuth = true
  firebaseAdmin: admin.app.App

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

      // ─── Storage Bucket Resolution ─────────────────────────────────────
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

      // ─── Firebase Admin Init ───────────────────────────────────────────
      console.log('[FirebaseAdapter] 🔧 Initializing Firebase Admin')

      let app: admin.app.App
      let isNewApp = false

      if (!admin.apps.length) {
        console.log('[FirebaseAdapter] 🆕 No existing Firebase app found, creating new one')
        isNewApp = true

        let rawConfig: any

        console.log('[FirebaseAdapter] 📦 Raw firebaseConfigJson type:', typeof _config.firebaseConfigJson)

        if (typeof _config.firebaseConfigJson === 'string') {
          try {
            console.log('[FirebaseAdapter] 🧪 Parsing service account JSON')
            rawConfig = parseFirebaseServiceAccount(_config.firebaseConfigJson)
            console.log('[FirebaseAdapter] ✅ Parsed service account:', {
              project_id:   rawConfig?.project_id,
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
          credential:    admin.credential.cert(serviceAccount),
          storageBucket: _config.storageBucket,
        })

        console.log('[FirebaseAdapter] ✅ Firebase Admin initialized')
      } else {
        console.log('[FirebaseAdapter] ♻️ Reusing existing Firebase app')
        app = admin.app()
      }

      this.firebaseAdmin = app

      // ─── Firestore Init ────────────────────────────────────────────────
      console.log('[FirebaseAdapter] 🧱 Initializing Firestore')

      this.firestore = this.firebaseAdmin.firestore()

      // settings() can only be called once on a fresh instance — skip on reuse
      if (isNewApp) {
        this.firestore.settings({ ignoreUndefinedProperties: true })
        console.log('[FirebaseAdapter] ✅ Firestore settings applied')
      } else {
        console.log('[FirebaseAdapter] ♻️ Skipping Firestore settings — reused app')
      }

      // ─── Storage Init ──────────────────────────────────────────────────
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

  // ─── Connection ──────────────────────────────────────────────────────────

  async testConnection() {
    try {
      await this.firestore.listCollections()
      return { success: true, message: 'Connected to Firebase Firestore' }
    } catch (err: any) {
      return { success: false, message: `Failed to connect to Firebase: ${err.message}` }
    }
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  async getUserById(uid: string): Promise<{ user?: any; error?: string }> {
    try {
      if (!uid) return { error: 'UID is required' }

      const doc = await this.firestore.collection('nxf_users').doc(uid).get()

      if (!doc.exists) return { error: 'User not found' }

      return { user: doc.data() }
    } catch (err: any) {
      return { error: err.message || 'Failed to fetch user' }
    }
  }

  async findUserByEmail(config: DBConfig, email: string) {
    if (!email) return null
    const snapshot = await this.firestore
      .collection('nxf_users')
      .where('user_email', '==', email)
      .limit(1)
      .get()
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  async findUserByEmailWithRetry(
    config: DBConfig,
    email: string,
    retries = 3,
    delayMs = 1000
  ) {
    let lastError: any
    for (let i = 0; i < retries; i++) {
      try {
        return await this.findUserByEmail(config, email)
      } catch (err) {
        lastError = err
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
    throw lastError
  }

  async registerUserInAuth(
    config: DBConfig,
    data: { email: string; password: string; full_name: string; notes?: string }
  ) {
    if (!data.email)     throw new Error('Email is required')
    if (!data.password)  throw new Error('Password is required')
    if (!data.full_name) throw new Error('Full Name is required')

    let userRecord
    try {
      userRecord = await admin.auth().getUserByEmail(data.email)
      throw new Error('User already exists in Firebase Auth')
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') throw err
    }

    userRecord = await admin.auth().createUser({
      email:       data.email,
      password:    data.password,
      displayName: data.full_name,
    })

    const hashedPassword = await this.hashPassword(data.password)

    await this.firestore.collection('nxf_users').doc(userRecord.uid).set({
      user_id:        userRecord.uid,
      user_email:     data.email,
      full_name:      data.full_name,
      password_hash:  hashedPassword,
      role:           'admin',
      status:         'active',
      notes:          data.notes || '',
      email_verified: true,
      token:          null,
      token_ttl:      null,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })

    return { id: userRecord.uid }
  }

  async registerUser(
    config: DBConfig,
    data: { email: string; password: string; full_name: string; notes?: string }
  ): Promise<{ userId?: string; error?: string }> {
    try {
      if (!data.email)     throw new Error('Email is required')
      if (!data.password)  throw new Error('Password is required')
      if (!data.full_name) throw new Error('Full Name is required')

      try {
        await admin.auth().getUserByEmail(data.email)
        return { error: 'User already exists in Firebase Auth' }
      } catch (err: any) {
        if (err.code !== 'auth/user-not-found') throw err
      }

      const userRec = await admin.auth().createUser({
        email:       data.email,
        password:    data.password,
        displayName: data.full_name,
      })

      const hashedPassword = await this.hashPassword(data.password)

      await this.firestore.collection('nxf_users').doc(userRec.uid).set({
        user_id:        userRec.uid,
        user_email:     data.email,
        full_name:      data.full_name,
        password_hash:  hashedPassword,
        role:           'user',
        status:         'active',
        notes:          data.notes || '',
        email_verified: false,
        token:          null,
        token_ttl:      null,
        created_at:     new Date().toISOString(),
        updated_at:     new Date().toISOString(),
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
    if (!user?.uid)      throw new Error('User UID is required')
    if (!user.full_name) throw new Error('Full name is required')

    const docRef   = this.firestore.collection('nxf_users').doc(user.uid)
    const existing = await docRef.get()

    if (!existing.exists) {
      await docRef.set({
        user_id:    user.uid,
        user_email: user.email || '',
        full_name:  user.full_name,
        role:       'user',
        status:     'active',
        notes:      user.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } else {
      await docRef.update({
        user_email: user.email || '',
        full_name:  user.full_name,
        updated_at: new Date().toISOString(),
      })
    }

    return user.uid
  }

  async createAdminUser(
    config: DBConfig,
    data: {
      user_id:    string
      user_email: string
      full_name:  string
      password:   string
      role:       string
      notes?:     string
    }
  ) {
    if (!data.user_email) throw new Error('Admin Email is required')
    if (!data.password)   throw new Error('Admin Password is required')
    if (!data.full_name)  throw new Error('Admin Full Name is required')

    const hashedPassword = await this.hashPassword(data.password)

    await this.firestore.collection('nxf_users').doc(data.user_id).set({
      user_id:        data.user_id,
      user_email:     data.user_email,
      full_name:      data.full_name,
      password_hash:  hashedPassword,
      role:           data.role || 'admin',
      status:         'active',
      notes:          data.notes || '',
      email_verified: true,
      token:          null,
      token_ttl:      null,
      created_at:     new Date().toISOString(),
      updated_at:     new Date().toISOString(),
    })

    try {
      await admin.auth().createUser({
        uid:         data.user_id,
        email:       data.user_email,
        password:    data.password,
        displayName: data.full_name,
      })
    } catch (err: any) {
      console.warn('⚠️ Firebase Auth admin user creation failed:', err.message)
    }

    return data.user_id
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async validateBuiltInSession(config: DBConfig, token: string) {
    try {
      return await admin.auth().verifyIdToken(token)
    } catch {
      return null
    }
  }

  async login() {
    return {
      error: 'login() via Firebase Admin SDK not supported. Use client SDK and pass ID token.',
    }
  }

  async sendResetEmail(config: DBConfig, email: string, redirectUrl?: string) {
    if (!email)       throw new Error('Email is required')
    if (!redirectUrl) throw new Error('Redirect URL is required')

    const link = await admin.auth().generatePasswordResetLink(email, { url: redirectUrl })
    console.log('🔗 Firebase password reset link:', link)
    return { success: true }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

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

  async createTable(tableName: string) {
    console.log(`[FirebaseAdapter] Skipping createTable for ${tableName} (Firestore has no tables)`)
    return true
  }

  // ─── Projects & Tenants ───────────────────────────────────────────────────

  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const docRef = await this.firestore.collection('nxf_system_projects').add({
      name:       data.name || 'defaultproject',
      user_id:    data.user_id || '',
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
      subdomain:  data.subdomain || 'console',
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

  // ─── Config ───────────────────────────────────────────────────────────────

  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    if (!data.project_id) throw new Error('project_id is required')
    const docRef = await this.firestore.collection('nxf_system_config').add({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return docRef.id
  }

  async findSystemConfigByUserId(config: DBConfig, userId: string) {
    try {
      console.log('[FirebaseAdapter] findSystemConfigByUserId START')

      if (!userId) {
        console.warn('[FirebaseAdapter] findSystemConfigByUserId — no userId provided')
        return null
      }

      const snapshot = await this.firestore
        .collection('nxf_system_config')
        .where('user_id', '==', userId)
        .limit(1)
        .get()

      if (snapshot.empty) {
        console.log('[FirebaseAdapter] findSystemConfigByUserId — no config found')
        return null
      }

      const doc = snapshot.docs[0]
      console.log('[FirebaseAdapter] findSystemConfigByUserId SUCCESS')
      return { id: doc.id, ...doc.data() }
    } catch (error) {
      console.error('[FirebaseAdapter] findSystemConfigByUserId FAILED', error)
      throw new Error(
        `FirebaseAdapter.findSystemConfigByUserId failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  // ─── Data Models ──────────────────────────────────────────────────────────

  async CreateDataModels(projectId: string, selectedProjectType: string) {
    if (!this.config || !projectId) throw new Error('Missing DB config or projectId')
    return CreateUserDataModels(this, projectId, selectedProjectType, [])
  }

  async createDataModelsFromUserEmail(email: string, selectedProjectType: string) {
    if (!email) throw new Error('Missing User Email')

    const user = await this.findUserByEmail(this.config, email)
    if (!user?.id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.id)
    if (!project?.id) throw new Error('Project not found')

    const db               = this.getFirestoreInstance()
    const modelsCollection = db.collection(`projects/${project.id}/models`)

    const result = await this.CreateDataModels(project.id, selectedProjectType)
    return {
      skipped: false,
      message: 'Data models inserted successfully',
      data:    result,
    }
  }

  // ─── Demo Content ─────────────────────────────────────────────────────────

  async installDemoContent(
    config: DBConfig,
    selectedProjectType: string
  ): Promise<{ success: boolean; error?: string; inserted?: number; skipped?: boolean }> {
    const fs   = require('fs')
    const path = require('path')

    try {
      const modelFolders = [
        `${selectedProjectType}_models`,
        'system_models',
        'users_models',
      ]

      const basePaths = modelFolders.map((folder) =>
        path.resolve(process.cwd(), '..', 'demo_content', folder)
      )

      let totalInserted = 0

      for (const basePath of basePaths) {
        console.log('CHECKING PATH =', basePath)

        if (!fs.existsSync(basePath)) {
          console.log('SKIP (missing folder):', basePath)
          continue
        }

        const files = fs
          .readdirSync(basePath)
          .filter((f: string) => f.endsWith('.json'))

        for (const file of files) {
          const fullPath = path.join(basePath, file)
          const raw      = fs.readFileSync(fullPath, 'utf-8')

          let json: any
          try {
            json = JSON.parse(raw)
          } catch (e: any) {
            console.log(`INVALID JSON: ${file}`, e.message)
            continue
          }

          const collectionName = file.replace('.json', '')
          const rows           = Array.isArray(json) ? json : json?.demo_data

          if (!rows || !Array.isArray(rows)) {
            console.log(`SKIPPING ${file} (no valid data array)`)
            continue
          }

          console.log(`INSTALLING ${collectionName} -> ${rows.length} docs`)

          const collectionRef = this.firestore.collection(collectionName)
          const batch         = this.firestore.batch()
          let count           = 0

          for (const row of rows) {
            try {
              const id =
                row.id ||
                row._id ||
                row[`${collectionName.slice(0, -1)}_id`] ||
                this.firestore.collection('_tmp').doc().id

              batch.set(collectionRef.doc(id), {
                ...row,
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString(),
              })

              count++
              totalInserted++
            } catch (err: any) {
              console.log(`FAILED PREP ${collectionName}:`, err.message)
            }
          }

          if (count > 0) await batch.commit()
        }
      }

      return { success: true, inserted: totalInserted }
    } catch (err: any) {
      console.error('FIREBASE DEMO INSTALL ERROR:', err)
      return { success: false, inserted: 0, error: err?.message || 'Failed to install demo content' }
    }
  }

  // ─── Storage ──────────────────────────────────────────────────────────────

  private getBucketName(): string {
    return this._config.storageBucket!
      .replace(/^gs:\/\//, '')
      .split('/')[0]
  }

  async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
    const retries  = 10
    const delayMs  = 5000
    const bucket   = this.storage.bucket(this.getBucketName())

    for (let i = 0; i < retries; i++) {
      try {
        for (const folder of DEFAULT_BUCKETS) {
          await bucket
            .file(`${folder}/.keep`)
            .save('', { resumable: false, contentType: 'text/plain' })
        }
        return { success: true, buckets: DEFAULT_BUCKETS }
      } catch (err: any) {
        console.error(`[FirebaseAdapter][Storage] Attempt ${i + 1} failed:`, err?.message || err)
        if (i === retries - 1)
          throw new Error(`Failed to setup Firebase Storage: ${err?.message || err}`)
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
    throw new Error('Unexpected storage setup failure')
  }

  async listFolders(): Promise<string[]> {
  try {
    const bucket  = this.storage.bucket(this.getBucketName())
    const [files] = await bucket.getFiles()

    console.log('[listFolders] total files in bucket:', files.length)
    files.forEach(f => console.log('[listFolders] file:', f.name))

    const folders = new Set<string>()

    files.forEach((file) => {
      if (!file.name) return
      const parts = file.name.split('/')
      if (parts.length > 1) {
        folders.add(parts[0])
      }
    })

    const result = Array.from(folders)
    console.log('[listFolders] result:', result)
    return result
  } catch (err: any) {
    console.error('[listFolders] FAILED:', err.message)
    return []
  }
}

async listFiles(folder: string): Promise<StorageFile[]> {
  try {
    const bucket  = this.storage.bucket(this.getBucketName())
    const [files] = await bucket.getFiles({ prefix: `${folder}/` })

    const results: StorageFile[] = []

    for (const file of files) {
      // ── Skip folder placeholders and .keep files ───────────────────
      if (file.name.endsWith('/')) continue
      if (file.name.endsWith('.keep')) continue

      const [meta]      = await file.getMetadata()
      const [signedUrl] = await file.getSignedUrl({
        action:  'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })

      const sizeBytes = parseInt(meta.size ?? '0')
      const sizeLabel = sizeBytes > 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(sizeBytes / 1024)} KB`

      results.push({
        id:         meta.id ?? file.name,
        name:       file.name.split('/').pop() ?? file.name,
        url:        signedUrl,
        size:       sizeLabel,
        mimeType:   meta.contentType ?? 'application/octet-stream',
        folder,
        folderPath: file.name,
        uploaded:   meta.timeCreated
          ? new Date(meta.timeCreated).toLocaleDateString('en-GB', {
              day:   '2-digit',
              month: 'short',
              year:  'numeric',
            })
          : '—',
      })
    }

    return results
  } catch (err: any) {
    console.error('[FirebaseAdapter.listFiles]', err.message)
    return []
  }
}

  async uploadFile(
    folder:   string,
    fileName: string,
    buffer:   Buffer,
    mimeType: string
  ): Promise<string> {
    console.log("I REACH UPLOAD")
     const bucket = this.storage.bucket(this.getBucketName())
     const file   = bucket.file(`${folder}/${fileName}`)

    console.log(`FILE: ${file}`);
    console.log(buffer)
    await file.save(buffer, { contentType: mimeType, resumable: false })

    const [signedUrl] = await file.getSignedUrl({
      action:  'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })

     return signedUrl
  }

  async deleteFile(folder: string, fileName: string): Promise<void> {
    await this.storage
      .bucket(this.getBucketName())
      .file(`${folder}/${fileName}`)
      .delete()
  }

  async deleteFolder(folder: string): Promise<void> {
    const bucket  = this.storage.bucket(this.getBucketName())
    const [files] = await bucket.getFiles({ prefix: `${folder}/` })
    await Promise.all(files.map((f) => f.delete()))
  }

  async createFolder(folder: string): Promise<void> {
    await this.storage
      .bucket(this.getBucketName())
      .file(`${folder}/.keep`)
      .save('', { contentType: 'text/plain', resumable: false })
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
    console.log('[FirebaseAdapter.deleteStorageRecordByFilePath] START | filePath:', filePath)

    const snapshot = await this.firestore
      .collection('nxf_storage')
      .where('file_path', '==', filePath)
      .limit(1)
      .get()

    console.log('[FirebaseAdapter.deleteStorageRecordByFilePath] snapshot empty:', snapshot.empty)
    console.log('[FirebaseAdapter.deleteStorageRecordByFilePath] docs found:', snapshot.docs.length)

    if (snapshot.empty) {
      console.warn('[FirebaseAdapter.deleteStorageRecordByFilePath] no record found for:', filePath)
      return
    }

    const doc = snapshot.docs[0]
    console.log('[FirebaseAdapter.deleteStorageRecordByFilePath] found doc id:', doc.id)
    console.log('[FirebaseAdapter.deleteStorageRecordByFilePath] found doc data:', doc.data())

    await doc.ref.delete()
    console.log('[FirebaseAdapter.deleteStorageRecordByFilePath] DELETE SUCCESS')
  } catch (err: any) {
    console.error('[FirebaseAdapter.deleteStorageRecordByFilePath] FAILED:', err.message)
    console.error('[FirebaseAdapter.deleteStorageRecordByFilePath] STACK:', err.stack)
    throw err
  }
}

async renameFile(folder: string, oldName: string, newName: string): Promise<void> {
  const bucket      = this.storage.bucket(this.getBucketName())
  const oldFile     = bucket.file(`${folder}/${oldName}`)
  const newFile     = bucket.file(`${folder}/${newName}`)

  // Copy to new name then delete old
  await oldFile.copy(newFile)
  await oldFile.delete()

  // Update nxf_storage record
  try {
    const snapshot = await this.firestore
      .collection('nxf_storage')
      .where('file_path', '==', `${folder}/${oldName}`)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        file_name: newName,
        file_path: `${folder}/${newName}`,
      })
      console.log('[FirebaseAdapter.renameFile] nxf_storage record updated')
    }
  } catch (err: any) {
    console.warn('[FirebaseAdapter.renameFile] nxf_storage update failed:', err.message)
  }
}

async moveFile(fromFolder: string, toFolder: string, fileName: string): Promise<void> {
  const bucket   = this.storage.bucket(this.getBucketName())
  const oldFile  = bucket.file(`${fromFolder}/${fileName}`)
  const newFile  = bucket.file(`${toFolder}/${fileName}`)

  // Copy to new folder then delete original
  await oldFile.copy(newFile)
  await oldFile.delete()

  // Update nxf_storage record
  try {
    const snapshot = await this.firestore
      .collection('nxf_storage')
      .where('file_path', '==', `${fromFolder}/${fileName}`)
      .limit(1)
      .get()

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        folder:    toFolder,
        file_path: `${toFolder}/${fileName}`,
      })
      console.log('[FirebaseAdapter.moveFile] nxf_storage record updated')
    }
  } catch (err: any) {
    console.warn('[FirebaseAdapter.moveFile] nxf_storage update failed:', err.message)
  }
}
}

export function getFirebaseAdapter(config: DBConfig) {
  if (!config) throw new Error('Firebase config is required')
  return new FirebaseAdapter(config)
}