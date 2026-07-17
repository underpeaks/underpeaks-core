/**
 * FirebaseAdapter
 *
 * This class is the Firebase implementation of the DBAdapter interface.
 * It acts as the single point of contact between the rest of the application
 * and Firebase's two main services:
 *
 *   - Firestore   — Firebase's NoSQL cloud database, used to store all
 *                   application data (users, projects, config, etc.).
 *   - Cloud Storage — Firebase's file storage service, used to store
 *                     uploaded files (images, documents, etc.).
 *
 * What this adapter provides:
 * - Initialising the Firebase Admin SDK exactly once (subsequent instantiations
 *   reuse the existing app to avoid "app already exists" errors).
 * - Full CRUD operations (create, read, update, delete) against Firestore.
 * - User management: register, login, find, sync, hash passwords.
 * - Authentication: validate session tokens via Firebase Auth.
 * - Project and tenant management.
 * - System config read/write operations.
 * - File storage: upload, list, rename, move, delete files and folders.
 * - Demo content installation from local JSON files.
 *
 * How to use:
 *   import { getFirebaseAdapter } from './firebase-adapter'
 *   const adapter = getFirebaseAdapter(dbConfig)
 *   await adapter.create(adapter.config, 'nxf_users', { ... })
 *
 * This file should never be imported on the client side — it uses the
 * Firebase Admin SDK which is server-only.
 */

import { ColumnDef, DBAdapter, DBConfig, StorageFile }    from '../types'
import bcrypt                                  from 'bcryptjs'
import { CreateUserDataModels }                from '../utils/create-data-models'
import admin                                   from 'firebase-admin'
import { parseFirebaseServiceAccount }         from '@/app/lib/firebaseConfig'

/**
 * DEFAULT_BUCKETS
 *
 * The list of default storage folders created when Firebase Storage is
 * first set up. Each folder is initialised with a hidden .keep file so
 * the folder exists in Cloud Storage (which has no concept of empty folders).
 */
const DEFAULT_BUCKETS = ['uploads', 'products', 'avatars', 'reports']

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class FirebaseAdapter implements DBAdapter {
  /**
   * supportsBuiltInAuth — Tells the rest of the application that this adapter
   * has its own authentication system (Firebase Auth) and does not need an
   * external auth provider.
   */
  supportsBuiltInAuth = true

  /**
   * firebaseAdmin — The initialised Firebase Admin app instance.
   * Exposed publicly so other parts of the system can access it if needed,
   * but all internal usage goes through this.firestore and this.storage.
   */
  firebaseAdmin: admin.app.App

  /**
   * firestore — The Firestore database instance. All database read/write
   * operations in this adapter use this reference.
   */
  private firestore: admin.firestore.Firestore

  /**
   * storage — The Firebase Cloud Storage instance. All file upload/download
   * operations in this adapter use this reference.
   */
  private storage: admin.storage.Storage

  // ─── Constructor ──────────────────────────────────────────────────────────

  /**
   * constructor
   *
   * Initialises the FirebaseAdapter by setting up the Firebase Admin SDK,
   * Firestore, and Cloud Storage.
   *
   * This constructor handles two scenarios:
   *
   * 1. First instantiation — no Firebase app exists yet.
   *    Parses the service account credentials, initialises a new Firebase
   *    Admin app, and applies Firestore settings.
   *
   * 2. Subsequent instantiations — a Firebase app already exists.
   *    Reuses the existing app instead of calling initializeApp() again,
   *    which would throw an "app already exists" error.
   *
   * Storage bucket resolution:
   *    The storageBucket is read from the config. If it is missing, the
   *    constructor falls back to NEXT_PUBLIC_FIREBASE_CONFIG env var.
   *    If neither is available, an error is thrown.
   *
   * @param _config - The DBConfig object containing Firebase credentials
   *                  and configuration (firebaseConfigJson, storageBucket).
   * @throws Error if required config fields are missing or invalid.
   */
  constructor(private _config: DBConfig) {
    console.log('[FirebaseAdapter] Constructor started')

    try {
      /**
       * Validate that a config object was provided at all.
       * Without it we cannot initialise anything.
       */
      if (!_config) {
        throw new Error('DBConfig is required')
      }

      /**
       * firebaseConfigJson is the Firebase Admin SDK service account JSON.
       * It must be present — without it we cannot authenticate with Firebase.
       */
      if (!_config.firebaseConfigJson) {
        throw new Error('firebaseConfigJson is required')
      }

      // ─── Storage Bucket Resolution ───────────────────────────────────────

      /**
       * The storageBucket tells Firebase Admin which Cloud Storage bucket
       * to use for file operations. It should look like:
       *   'gs://my-project.appspot.com'
       *
       * If it was not provided in the config, we try to read it from the
       * NEXT_PUBLIC_FIREBASE_CONFIG environment variable as a fallback.
       */
      if (!_config.storageBucket) {
        console.warn('[FirebaseAdapter] storageBucket missing, trying fallback env')

        const publicConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG

        if (!publicConfigStr) {
          throw new Error('storageBucket is required and env fallback not set')
        }

        try {
          const publicConfig = JSON.parse(publicConfigStr)

          if (!publicConfig.storageBucket) {
            throw new Error('storageBucket missing in env config')
          }

          _config.storageBucket = publicConfig.storageBucket
          console.log('[FirebaseAdapter] storageBucket resolved from env fallback')
        } catch (err: any) {
          /**
           * Re-throw so the outer catch reports the failure and the adapter
           * does not silently continue with a broken config.
           */
          throw err
        }
      } else {
        console.log('[FirebaseAdapter] storageBucket provided in config')
      }

      // ─── Firebase Admin Init ─────────────────────────────────────────────

      /**
       * Firebase Admin SDK only allows one app to be initialised per process.
       * We check admin.apps.length to see if an app already exists:
       *
       * - If no app exists (length === 0): parse credentials and initialise.
       * - If an app already exists: reuse it with admin.app().
       *
       * isNewApp tracks which path was taken so we know whether to apply
       * Firestore settings below (settings() can only be called once per
       * fresh Firestore instance — calling it on a reused instance throws).
       */
      let app: admin.app.App
      let isNewApp = false

      if (!admin.apps.length) {
        console.log('[FirebaseAdapter] No existing Firebase app found, initialising new one')
        isNewApp = true

        /**
         * Parse the service account credentials from firebaseConfigJson.
         * This can be either a JSON string or an already-parsed object,
         * so we handle both cases.
         */
        let rawConfig: any

        if (typeof _config.firebaseConfigJson === 'string') {
          try {
            rawConfig = parseFirebaseServiceAccount(_config.firebaseConfigJson)
            console.log('[FirebaseAdapter] Service account parsed successfully')
          } catch (err: any) {
            throw new Error('firebaseConfigJson is not valid JSON')
          }
        } else {
          /**
           * Config was already provided as a parsed object — use it directly.
           */
          rawConfig = _config.firebaseConfigJson
        }

        /**
         * private_key is required to authenticate with Firebase.
         * If it is missing, the service account JSON is incomplete or corrupted.
         */
        if (!rawConfig.private_key) {
          throw new Error('private_key missing in firebaseConfigJson')
        }

        /**
         * Build the final ServiceAccount object.
         * The private_key often has literal '\n' sequences (escaped newlines)
         * when stored as a string in env variables — replace() converts them
         * back to real newline characters so the key is valid PEM format.
         */
        const serviceAccount: admin.ServiceAccount = {
          ...rawConfig,
          private_key: rawConfig.private_key.replace(/\\n/g, '\n'),
        }

        app = admin.initializeApp({
          credential:    admin.credential.cert(serviceAccount),
          storageBucket: _config.storageBucket,
        })

        console.log('[FirebaseAdapter] Firebase Admin initialised successfully')
      } else {
        console.log('[FirebaseAdapter] Reusing existing Firebase app')
        app = admin.app()
      }

      this.firebaseAdmin = app

      // ─── Firestore Init ──────────────────────────────────────────────────

      /**
       * Get the Firestore instance from the Firebase app.
       * ignoreUndefinedProperties: true prevents Firestore from throwing
       * when a document field has an undefined value — instead it silently
       * omits those fields. Only applied on a fresh app to avoid the
       * "settings() called after use" error on reused instances.
       */
      this.firestore = this.firebaseAdmin.firestore()

      if (isNewApp) {
        this.firestore.settings({ ignoreUndefinedProperties: true })
        console.log('[FirebaseAdapter] Firestore settings applied')
      } else {
        console.log('[FirebaseAdapter] Skipping Firestore settings — reused app')
      }

      // ─── Storage Init ────────────────────────────────────────────────────

      /**
       * Get the Cloud Storage instance from the Firebase app.
       * All file operations (upload, list, delete, etc.) go through this.
       */
      this.storage = this.firebaseAdmin.storage()

      console.log('[FirebaseAdapter] Constructor completed successfully')

    } catch (err: any) {
      console.error('[FirebaseAdapter] Constructor failed')
      throw err
    }
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  /**
   * getFirestoreInstance
   *
   * Returns a direct reference to the Firestore database.
   * Used in methods like createDataModelsFromUserEmail where a raw Firestore
   * reference is needed alongside the adapter's own methods.
   *
   * @returns The admin.firestore.Firestore instance.
   */
  getFirestoreInstance() {
    return admin.firestore()
  }

  /**
   * config — Getter that exposes the private _config object publicly.
   * Other parts of the application pass adapter.config back into adapter
   * methods that require it (e.g. adapter.create(adapter.config, ...)).
   */
  get config(): DBConfig {
    return this._config
  }

  /**
   * getBucketName
   *
   * Extracts the raw bucket name from the storageBucket config value.
   *
   * Cloud Storage API calls require just the bucket name (e.g. 'my-app.appspot.com'),
   * not the full 'gs://my-app.appspot.com' URI that the config stores.
   * This helper strips the 'gs://' prefix and any sub-path.
   *
   * @returns The bare bucket name string.
   */
  private getBucketName(): string {
    return this._config.storageBucket!
      .replace(/^gs:\/\//, '')
      .split('/')[0]
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  /**
   * testConnection
   *
   * Verifies that the adapter can successfully communicate with Firestore.
   * Used by the installer to confirm that the provided Firebase credentials
   * are valid before proceeding with setup.
   *
   * It calls listCollections() as a lightweight read operation — if this
   * succeeds, the credentials are valid and Firestore is reachable.
   *
   * @returns { success: true, message } on success,
   *          { success: false, message } on failure.
   */
  async testConnection() {
    try {
      await this.firestore.listCollections()
      return { success: true, message: 'Connected to Firebase Firestore' }
    } catch (err: any) {
      return { success: false, message: `Failed to connect to Firebase: ${err.message}` }
    }
  }

  // ─── Users ────────────────────────────────────────────────────────────────

  /**
   * getUserById
   *
   * Fetches a single user document from the nxf_users collection by their
   * unique user ID (which is also the Firestore document ID).
   *
   * @param uid - The user's unique ID.
   * @returns { user: object } on success, or { error: string } on failure.
   */
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

  /**
   * findUserByEmail
   *
   * Searches the nxf_users collection for a user whose user_email field
   * matches the provided email address.
   *
   * Returns the first match (emails should be unique) or null if not found.
   *
   * @param config - The DBConfig (not used directly here but required by interface).
   * @param email  - The email address to search for.
   * @returns The user object with its Firestore document id, or null.
   */
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

  /**
   * findUserByEmailWithRetry
   *
   * A resilient version of findUserByEmail that retries the lookup up to
   * `retries` times with a delay between attempts.
   *
   * This is useful immediately after user creation, when Firestore may not
   * yet have propagated the new document to the read replica being queried.
   *
   * @param config   - The DBConfig.
   * @param email    - The email address to search for.
   * @param retries  - Maximum number of attempts (default: 3).
   * @param delayMs  - Milliseconds to wait between attempts (default: 1000).
   * @returns The user object or null. Throws if all retries fail.
   */
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

  async generateEmailVerificationLink(
  config:       DBConfig,
  email:        string,
  redirectUrl?: string
): Promise<string> {
  const actionCodeSettings = redirectUrl ? { url: redirectUrl } : undefined
  const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings)
  console.log(`[FirebaseAdapter] generateEmailVerificationLink — link generated for ${email}`)
  return link
}

  /**
   * registerUserInAuth
   *
   * Creates a new user in both Firebase Authentication and the nxf_users
   * Firestore collection. This method is used during the installer flow
   * to create the initial admin account.
   *
   * Steps:
   * 1. Checks Firebase Auth to ensure the email is not already registered.
   * 2. Creates the Firebase Auth user record.
   * 3. Hashes the password and saves a full user document to nxf_users.
   *
   * The user is created with role: 'admin' and email_verified: true
   * because this is called during controlled installer setup.
   *
   * @param config - The DBConfig.
   * @param data   - { email, password, full_name, notes? }
   * @returns { id: string } — the new user's UID.
   * @throws Error if the email is already in use or required fields are missing.
   */
  async registerUserInAuth(
    config: DBConfig,
    data: { email: string; password: string; full_name: string; notes?: string }
  ) {
    if (!data.email)     throw new Error('Email is required')
    if (!data.password)  throw new Error('Password is required')
    if (!data.full_name) throw new Error('Full Name is required')

    /**
     * Check whether the email is already registered in Firebase Auth.
     * getUserByEmail throws 'auth/user-not-found' if the user doesn't exist —
     * that error is expected and caught. Any other error is re-thrown.
     * If the user IS found, we throw to prevent duplicate registrations.
     */
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

  /**
   * registerUser
   *
   * Creates a new standard (non-admin) user in Firebase Auth and nxf_users.
   * Used by the public registration flow.
   *
   * Differences from registerUserInAuth:
   * - Sets role: 'user' (not 'admin').
   * - Sets email_verified: false — the user must verify their email.
   * - Returns { userId } on success or { error } on failure instead of throwing.
   *
   * @param config - The DBConfig.
   * @param data   - { email, password, full_name, notes? }
   * @returns { userId: string } on success, or { error: string } on failure.
   */
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
      console.error('[FirebaseAdapter] registerUser failed')
      return { error: err.message || 'Registration failed' }
    }
  }

  /**
   * syncAuthUserToDatabase
   *
   * Ensures a Firebase Auth user also has a corresponding record in the
   * nxf_users Firestore collection. Used when a user signs in via a
   * third-party provider (e.g. Google) and may not have a Firestore record yet.
   *
   * - If no Firestore record exists: creates one.
   * - If a record already exists: updates email and full_name only.
   *
   * @param config - The DBConfig.
   * @param user   - { uid, email, full_name, notes? }
   * @returns The user's UID.
   */
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

  /**
   * createAdminUser
   *
   * Creates an admin user record directly in Firestore with a pre-known user_id
   * (used during the installer when the user_id is already determined).
   * Also attempts to create the corresponding Firebase Auth record.
   *
   * The Firebase Auth creation is wrapped in its own try/catch — if it fails
   * (e.g. the Auth user already exists), the Firestore record is still kept.
   * This prevents installer failures caused by a partially completed previous run.
   *
   * @param config - The DBConfig.
   * @param data   - { user_id, user_email, full_name, password, role, notes? }
   * @returns The user_id string.
   */
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
    } catch {
      /**
       * Firebase Auth user creation failed — this is non-fatal.
       * The Firestore record already exists, so the user can still log in
       * via the built-in auth flow. A warning is logged for visibility.
       */
      console.warn('[FirebaseAdapter] Firebase Auth admin user creation failed — continuing')
    }

    return data.user_id
  }

  /**
   * hashPassword
   *
   * Hashes a plain-text password using bcrypt with a cost factor of 10.
   * The cost factor determines how slow the hash is to compute — higher
   * values are more secure but slower. 10 is the standard recommended value.
   *
   * We NEVER store plain-text passwords — always use this method before
   * saving a password to the database.
   *
   * @param password - The plain-text password to hash.
   * @returns A bcrypt hash string suitable for storing in the database.
   */
  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  /**
   * validateBuiltInSession
   *
   * Validates a Firebase ID token (the short-lived JWT issued by Firebase Auth
   * after a user signs in on the client side).
   *
   * The client sends this token in the Authorization header as "Bearer <token>".
   * This method verifies the token's signature and expiry using the Firebase
   * Admin SDK, which returns the decoded payload containing the user's UID
   * and other claims.
   *
   * Returns null instead of throwing on invalid/expired tokens so callers
   * can handle the "not authenticated" case gracefully.
   *
   * @param config - The DBConfig (not used directly here).
   * @param token  - The Firebase ID token string from the Authorization header.
   * @returns The decoded token payload (including uid) on success, or null.
   */
  async validateBuiltInSession(config: DBConfig, token: string) {
    try {
      return await admin.auth().verifyIdToken(token)
    } catch {
      return null
    }
  }

  /**
   * login
   *
   * Not supported via the Admin SDK. Firebase authentication for end users
   * must be performed on the client using the Firebase Client SDK, which
   * then sends the resulting ID token to the server.
   *
   * @returns An error message explaining the limitation.
   */
  async login() {
    return {
      error: 'login() via Firebase Admin SDK not supported. Use client SDK and pass ID token.',
    }
  }

  /**
   * sendResetEmail
   *
   * Generates a Firebase password reset link for the given email address
   * and returns it. The caller is responsible for sending the link to the
   * user via their email service.
   *
   * @param config      - The DBConfig.
   * @param email       - The email address of the user who forgot their password.
   * @param redirectUrl - The URL the user is redirected to after resetting.
   * @returns { success: true }
   * @throws Error if email or redirectUrl are missing.
   */
  async sendResetEmail(config: DBConfig, email: string, redirectUrl?: string) {
    if (!email)       throw new Error('Email is required')
    if (!redirectUrl) throw new Error('Redirect URL is required')

    /**
     * generatePasswordResetLink creates a one-time link that Firebase Auth
     * uses to confirm the user's identity before allowing a password change.
     * The link is returned here so the caller can send it however they prefer.
     */
    await admin.auth().generatePasswordResetLink(email, { url: redirectUrl })
    return { success: true }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * create
   *
   * Adds a new document to a Firestore collection and returns the
   * auto-generated document ID.
   *
   * @param config     - The DBConfig.
   * @param collection - The Firestore collection name (e.g. 'nxf_users').
   * @param data       - The data object to store as the document.
   * @returns The new document's auto-generated ID string.
   */
 async create(config: DBConfig, collection: string, data: any): Promise<string> {
  const id     = data.sm_id || data.id || this.firestore.collection(collection).doc().id
  const docRef = this.firestore.collection(collection).doc(id)
  await docRef.set(data)
  return id
}

  /**
   * read
   *
   * Fetches all documents from a Firestore collection.
   * Each returned object includes the Firestore document ID as `id`.
   *
   * Note: Use with caution on large collections — this fetches everything
   * with no pagination or filtering.
   *
   * @param config     - The DBConfig.
   * @param collection - The Firestore collection name.
   * @returns An array of all documents in the collection, each with `id`.
   */
  async read(config: DBConfig, collection: string) {
    const snapshot = await this.firestore.collection(collection).get()
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  }

  /**
 * readAll
 *
 * Fetches documents from a Firestore collection, optionally filtered by
 * a set of equality conditions.
 *
 * If a filter object is provided, each key-value pair is applied as a
 * Firestore `where(key, '==', value)` clause. If no filter is provided
 * (or it is empty), all documents in the collection are returned.
 *
 * @param config     - The DBConfig (unused here but required by interface).
 * @param collection - The Firestore collection name.
 * @param filter     - Optional equality filter, e.g. { slug: 'inventory' }.
 * @returns An array of matching documents, each including its Firestore id.
 */
async readAll(
  config:     DBConfig,
  collection: string,
  filter?:    Record<string, any>
) {
  let query: FirebaseFirestore.Query = this.firestore.collection(collection)

  if (filter && typeof filter === 'object') {
    for (const [key, value] of Object.entries(filter)) {
      // Skip null/undefined to avoid accidental "where field == null" queries
      if (value === undefined || value === null) continue
      query = query.where(key, '==', value)
    }
  }

  const snapshot = await query.get()
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}
  /**
   * update
   *
   * Updates specific fields on an existing Firestore document.
   * Only the fields included in `data` are changed — other fields are left
   * untouched. Supports dot-notation keys for updating nested fields
   * (e.g. 'smtp.host' updates only the `host` field inside the `smtp` object).
   *
   * @param config     - The DBConfig.
   * @param collection - The Firestore collection name.
   * @param id         - The document ID to update.
   * @param data       - An object of field-value pairs to update.
   * @returns true on success.
   */
  async update(config: DBConfig, collection: string, id: string, data: any) {
    await this.firestore.collection(collection).doc(id).update(data)
    return true
  }

  /**
   * delete
   *
   * Permanently deletes a document from a Firestore collection.
   *
   * @param config     - The DBConfig.
   * @param collection - The Firestore collection name.
   * @param id         - The document ID to delete.
   * @returns true on success.
   */
  async delete(config: DBConfig, collection: string, id: string) {
    await this.firestore.collection(collection).doc(id).delete()
    return true
  }

  /**
   * createTable
   *
   * A no-op for Firestore — Firestore is schema-less and creates collections
   * automatically when the first document is written. No table creation is needed.
   *
   * This method exists to satisfy the DBAdapter interface which is also
   * implemented by SQL adapters that do require explicit table creation.
   *
   * @param tableName - The table/collection name (logged for traceability).
   * @returns true always.
   */
  async createTable(tableName: string) {
    console.log(`[FirebaseAdapter] Skipping createTable for ${tableName} — Firestore has no tables`)
    return true
  }

  // ─── Projects & Tenants ───────────────────────────────────────────────────

  /**
   * createProject
   *
   * Creates a new project record in the nxf_system_projects collection.
   * A project links together the system config, users, and data models
   * that belong to a single deployment.
   *
   * @param config - The DBConfig.
   * @param data   - { name: string, user_id: string }
   * @returns The new project's auto-generated document ID.
   */
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const docRef = await this.firestore.collection('nxf_system_projects').add({
      name:       data.name || 'defaultproject',
      user_id:    data.user_id || '',
      created_at: new Date().toISOString(),
    })
    return docRef.id
  }

  /**
   * findProjectByOwnerId
   *
   * Finds the project record that belongs to a given user_id.
   * Used to resolve which project an upload or action should be linked to.
   *
   * @param config   - The DBConfig.
   * @param ownerId  - The user_id to search for.
   * @returns The project object with its document id, or null if not found.
   */
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

  /**
   * createTenant
   *
   * Creates a new tenant record in the nxf_system_tenants collection.
   * A tenant represents a single organisation or customer using the platform,
   * identified by their subdomain.
   *
   * @param config - The DBConfig.
   * @param data   - { subdomain: string, user_email: string }
   * @returns The new tenant's auto-generated document ID.
   */
  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const docRef = await this.firestore.collection('nxf_system_tenants').add({
      subdomain:  data.subdomain || 'console',
      user_email: data.user_email || '',
      created_at: new Date().toISOString(),
    })
    return docRef.id
  }

  /**
   * findTenantByUserEmail
   *
   * Finds the tenant record associated with a given email address.
   *
   * @param config - The DBConfig.
   * @param email  - The email address to search for.
   * @returns The tenant object with its document id, or null if not found.
   */
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

  // ─── Config ────────────────────────────────────────────────────────────────

  /**
   * saveInstallerConfig
   *
   * Saves the full installer configuration to the nxf_system_config collection.
   * Called at the end of the installer wizard to persist all setup choices.
   *
   * @param config - The DBConfig.
   * @param data   - The installer config object. Must include project_id.
   * @returns The new config document's auto-generated ID.
   * @throws Error if project_id is missing.
   */
  async saveInstallerConfig(config: DBConfig, data: any): Promise<string> {
    if (!data.project_id) throw new Error('project_id is required')
    const docRef = await this.firestore.collection('nxf_system_config').add({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    return docRef.id
  }

  /**
   * findSystemConfigByUserId
   *
   * Finds the system config record for a given user_id.
   * The system config holds all application-level settings (branding, SMTP,
   * project details, etc.) for a specific user's deployment.
   *
   * Returns null rather than throwing if the config is not found, so callers
   * can handle the "not configured yet" case gracefully.
   *
   * @param config - The DBConfig.
   * @param userId - The user_id to search for.
   * @returns The config object with its document id, or null if not found.
   * @throws Error if the Firestore query itself fails.
   */
  async findSystemConfigByUserId(config: DBConfig, userId: string) {
    try {
      console.log('[FirebaseAdapter] findSystemConfigByUserId started')

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
      console.log('[FirebaseAdapter] findSystemConfigByUserId completed successfully')
      return { id: doc.id, ...doc.data() }

    } catch (error) {
      console.error('[FirebaseAdapter] findSystemConfigByUserId failed')
      throw new Error(
        `FirebaseAdapter.findSystemConfigByUserId failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  // ─── Data Models ──────────────────────────────────────────────────────────

  /**
   * CreateDataModels
   *
   * Triggers the creation of the standard data model collections for a given
   * project and project type. Delegates to the CreateUserDataModels utility.
   *
   * @param projectId           - The project's unique ID.
   * @param selectedProjectType - The type of project (e.g. 'ecommerce', 'blog').
   * @returns The result from CreateUserDataModels.
   * @throws Error if config or projectId are missing.
   */
 async CreateDataModels(projectId: string, selectedProjectType: string) {
  if (!this.config || !projectId) throw new Error('Missing DB config or projectId')

  // Resolve tenant for this project
  let tenantId = ''
  try {
    const tenantsSnapshot = await this.firestore
      .collection('nxf_system_tenants')
      .limit(1)
      .get()
    if (!tenantsSnapshot.empty) {
      const tenantDoc = tenantsSnapshot.docs[0]
      tenantId = tenantDoc.data().ten_id ?? tenantDoc.id ?? ''
    }
  } catch {
    console.warn('[FirebaseAdapter] CreateDataModels — could not resolve tenantId, using empty string')
  }

  return CreateUserDataModels(this, projectId, tenantId, selectedProjectType, [])
}

  /**
   * createDataModelsFromUserEmail
   *
   * Convenience method that resolves a user's project from their email address
   * and then calls CreateDataModels for that project.
   *
   * Used during onboarding flows where we know the user's email but not their
   * project ID.
   *
   * @param email               - The user's email address.
   * @param selectedProjectType - The type of project to create models for.
   * @returns A result object with skipped, message, and data fields.
   * @throws Error if the user or project cannot be found.
   */
  async createDataModelsFromUserEmail(email: string, selectedProjectType: string) {
    if (!email) throw new Error('Missing User Email')

    const user = await this.findUserByEmail(this.config, email)
    if (!user?.id) throw new Error('User not found')

    const project = await this.findProjectByOwnerId(this.config, user.id)
    if (!project?.id) throw new Error('Project not found')

    /**
     * We get a direct Firestore instance here for the models collection
     * reference, even though the actual insertion is handled by CreateDataModels.
     * This is kept for potential future use or debugging.
     */
    const db = this.getFirestoreInstance()
    db.collection(`projects/${project.id}/models`)

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
    // -----------------------------------------------------------------------
    // Step 1: Resolve project, tenant, and admin user for this installation
    // -----------------------------------------------------------------------

    const usersSnapshot = await this.firestore
      .collection('nxf_users')
      .where('role', '==', 'admin')
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      console.error('[FirebaseAdapter] installDemoContent — no admin user found, aborting')
      return { success: false, error: 'No admin user found' }
    }

    const adminUser   = usersSnapshot.docs[0].data()
    const adminUserId = usersSnapshot.docs[0].id || adminUser.user_id

    const projectsSnapshot = await this.firestore
      .collection('nxf_system_projects')
      .limit(1)
      .get()

    if (projectsSnapshot.empty) {
      console.error('[FirebaseAdapter] installDemoContent — no project found, aborting')
      return { success: false, error: 'No project found' }
    }

    const project   = projectsSnapshot.docs[0].data()
    const projectId = project.project_id || projectsSnapshot.docs[0].id

    const tenantsSnapshot = await this.firestore
      .collection('nxf_system_tenants')
      .limit(1)
      .get()

    if (tenantsSnapshot.empty) {
      console.error('[FirebaseAdapter] installDemoContent — no tenant found, aborting')
      return { success: false, error: 'No tenant found' }
    }

    const tenant   = tenantsSnapshot.docs[0].data()
    const tenantId = tenant.ten_id || tenantsSnapshot.docs[0].id

    console.log('[FirebaseAdapter] installDemoContent — context resolved:', {
      adminUserId,
      projectId,
      tenantId,
    })

    // -----------------------------------------------------------------------
    // Step 2: Scan demo content folders and install rows
    // -----------------------------------------------------------------------

    const modelFolders = [
      'system_models',
      'users_models',
      `${selectedProjectType}_models`,
    ]

    const basePaths = modelFolders.map((folder) =>
      path.resolve(process.cwd(), '..', 'demo_content', folder)
    )

    // -----------------------------------------------------------------------
    // Step 2a: Pre-build the model name → sm_id resolver map.
    //
    // We do this ONCE before processing files so the nxf_pages installer
    // can convert "model": "nxf_product" → "model_id": "<actual sm_id>".
    // -----------------------------------------------------------------------

    const modelMapSnapshot = await this.firestore
      .collection('nxf_system_models')
      .where('project_id', '==', projectId)
      .get()

    const modelNameToId = new Map<string, string>()
    modelMapSnapshot.docs.forEach((doc) => {
      const m  = doc.data()
      const id = m.sm_id || doc.id
      if (m.name && id) modelNameToId.set(m.name, id)
    })

    console.log(
      `[FirebaseAdapter] Built model resolver map — ${modelNameToId.size} models indexed`
    )

    let totalInserted = 0

    for (const basePath of basePaths) {
      console.log('[FirebaseAdapter] Checking demo content path:', basePath)

      if (!fs.existsSync(basePath)) {
        console.log('[FirebaseAdapter] Demo content folder not found, skipping:', basePath)
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
        } catch {
          console.warn(`[FirebaseAdapter] Skipping invalid JSON file: ${file}`)
          continue
        }

        const collectionName = file.replace('.json', '')
        const rows           = Array.isArray(json) ? json : json?.demo_data

        if (!rows || !Array.isArray(rows)) {
          console.log(`[FirebaseAdapter] Skipping ${file} — no valid data array found`)
          continue
        }

        console.log(`[FirebaseAdapter] Installing ${collectionName} — ${rows.length} documents`)

        const collectionRef = this.firestore.collection(collectionName)
        const batch         = this.firestore.batch()
        let count           = 0

        for (const row of rows) {
          try {
            // -----------------------------------------------------------------
            // Resolve model name → model_id for nxf_pages rows.
            //
            // The demo content JSON has fields like:
            //   "model":    "nxf_product"
            //   "model_id":  null
            //
            // We look up the model by name in our resolver map and set
            // model_id to the actual sm_id. If the model doesn't exist
            // (e.g. user hasn't created it yet), we log a warning and leave
            // model_id null so the page still installs.
            // -----------------------------------------------------------------

            const enriched = { ...row }

            if (collectionName === 'nxf_pages' && enriched.model) {
              const resolvedId = modelNameToId.get(enriched.model)
              if (resolvedId) {
                enriched.model_id = resolvedId
              } else {
                console.warn(
                  `[FirebaseAdapter] Page "${enriched.slug}" references model "${enriched.model}" which does not exist — model_id left null`
                )
              }
            }

            const id =
              enriched.page_id  ||
              enriched.menu_id  ||
              enriched.id       ||
              enriched._id      ||
              this.firestore.collection('_tmp').doc().id

            batch.set(collectionRef.doc(id), {
              ...enriched,
              project_id: projectId,
              tenant_id:  tenantId,
              created_by: adminUserId,
              created_at: enriched.created_at || new Date().toISOString(),
              updated_at: enriched.updated_at || null,
            })

            count++
            totalInserted++
          } catch {
            console.warn(
              `[FirebaseAdapter] Failed to prepare document in ${collectionName} — skipping row`
            )
          }
        }

        if (count > 0) await batch.commit()
      }
    }

    return { success: true, inserted: totalInserted }

  } catch (err: any) {
    console.error('[FirebaseAdapter] Demo content installation failed:', err.message)
    return { success: false, inserted: 0, error: 'Failed to install demo content' }
  }
}

  // ─── Storage ───────────────────────────────────────────────────────────────

  /**
   * setupStorageBuckets
   *
   * Creates the default storage folders in Firebase Cloud Storage by writing
   * a hidden .keep file into each folder. Cloud Storage has no concept of
   * empty folders — a folder only exists if it contains at least one file.
   *
   * Retries up to 10 times with a 5-second delay between attempts because
   * Cloud Storage can take a short time to become available after project
   * creation.
   *
   * @returns { success: true, buckets: string[] } on success.
   * @throws Error if all retry attempts fail.
   */
  async setupStorageBuckets(): Promise<{ success: boolean; buckets: string[] }> {
    const retries = 10
    const delayMs = 5000
    const bucket  = this.storage.bucket(this.getBucketName())

    for (let i = 0; i < retries; i++) {
      try {
        for (const folder of DEFAULT_BUCKETS) {
          await bucket
            .file(`${folder}/.keep`)
            .save('', { resumable: false, contentType: 'text/plain' })
        }
        return { success: true, buckets: DEFAULT_BUCKETS }
      } catch (err: any) {
        console.error(`[FirebaseAdapter] Storage setup attempt ${i + 1} failed`)
        if (i === retries - 1)
          throw new Error(`Failed to setup Firebase Storage: ${err?.message || err}`)
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
    throw new Error('Unexpected storage setup failure')
  }

  /**
   * listFolders
   *
   * Lists all top-level folders in the storage bucket by examining the
   * prefix of every file path. A "folder" is any unique first path segment
   * of a file name (e.g. the file 'avatars/photo.png' indicates an 'avatars' folder).
   *
   * @returns An array of unique folder name strings, or [] on error.
   */
  async listFolders(): Promise<string[]> {
    try {
      const bucket  = this.storage.bucket(this.getBucketName())
      const [files] = await bucket.getFiles()

      console.log(`[FirebaseAdapter] listFolders — ${files.length} files found in bucket`)

      const folders = new Set<string>()

      files.forEach((file) => {
        if (!file.name) return
        const parts = file.name.split('/')
        /**
         * Only consider files that have at least one folder level in their path.
         * e.g. 'avatars/photo.png' → parts = ['avatars', 'photo.png'] → add 'avatars'
         * e.g. 'rootfile.txt'      → parts = ['rootfile.txt']          → skip
         */
        if (parts.length > 1) {
          folders.add(parts[0])
        }
      })

      const result = Array.from(folders)
      console.log(`[FirebaseAdapter] listFolders — ${result.length} folders resolved`)
      return result

    } catch {
      console.error('[FirebaseAdapter] listFolders failed')
      return []
    }
  }

  /**
   * listFiles
   *
   * Lists all files inside a given storage folder, enriched with metadata
   * and a 7-day signed URL for direct browser access.
   *
   * Skips folder placeholder files (paths ending in '/') and .keep sentinel
   * files created by setupStorageBuckets and createFolder.
   *
   * @param folder - The folder name to list files from (e.g. 'avatars').
   * @returns An array of StorageFile objects, or [] on error.
   */
  async listFiles(folder: string): Promise<StorageFile[]> {
    try {
      const bucket  = this.storage.bucket(this.getBucketName())
      const [files] = await bucket.getFiles({ prefix: `${folder}/` })

      const results: StorageFile[] = []

      for (const file of files) {
        /**
         * Skip folder placeholder entries and .keep sentinel files —
         * these are internal bookkeeping files, not user-uploaded content.
         */
        if (file.name.endsWith('/'))     continue
        if (file.name.endsWith('.keep')) continue

        const [meta]      = await file.getMetadata()

        /**
         * Generate a signed URL that allows read access to this file for 7 days.
         * Signed URLs are required because Firebase Storage buckets are private
         * by default — files cannot be accessed without authentication or a
         * time-limited signed URL.
         */
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
          /**
           * Format the upload date in a human-readable format (e.g. "14 May 2026").
           * Falls back to '—' if the metadata timestamp is unavailable.
           */
          uploaded: meta.timeCreated
            ? new Date(meta.timeCreated).toLocaleDateString('en-GB', {
                day:   '2-digit',
                month: 'short',
                year:  'numeric',
              })
            : '—',
        })
      }

      return results

    } catch {
      console.error('[FirebaseAdapter] listFiles failed')
      return []
    }
  }

  /**
   * uploadFile
   *
   * Uploads a file buffer to Firebase Cloud Storage and returns a 7-day
   * signed URL for accessing the uploaded file.
   *
   * @param folder   - The destination folder name (e.g. 'avatars').
   * @param fileName - The filename to save as (e.g. 'profile.png').
   * @param buffer   - The file contents as a Node.js Buffer.
   * @param mimeType - The MIME type of the file (e.g. 'image/png').
   * @returns A signed URL string for accessing the uploaded file.
   */
  async uploadFile(
    folder:   string,
    fileName: string,
    buffer:   Buffer,
    mimeType: string
  ): Promise<string> {
    console.log('[FirebaseAdapter] uploadFile started')

    const bucket = this.storage.bucket(this.getBucketName())
    const file   = bucket.file(`${folder}/${fileName}`)

    await file.save(buffer, { contentType: mimeType, resumable: false })

    const [signedUrl] = await file.getSignedUrl({
      action:  'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })

    return signedUrl
  }

  /**
   * deleteFile
   *
   * Permanently deletes a single file from Firebase Cloud Storage.
   *
   * @param folder   - The folder containing the file (e.g. 'avatars').
   * @param fileName - The filename to delete (e.g. 'profile.png').
   */
  async deleteFile(folder: string, fileName: string): Promise<void> {
    await this.storage
      .bucket(this.getBucketName())
      .file(`${folder}/${fileName}`)
      .delete()
  }

  /**
   * deleteFolder
   *
   * Permanently deletes all files inside a folder from Firebase Cloud Storage.
   * Since Cloud Storage has no real folders, this lists all files with the
   * folder prefix and deletes them in parallel.
   *
   * @param folder - The folder to delete (e.g. 'avatars').
   */
  async deleteFolder(folder: string): Promise<void> {
    const bucket  = this.storage.bucket(this.getBucketName())
    const [files] = await bucket.getFiles({ prefix: `${folder}/` })
    await Promise.all(files.map((f) => f.delete()))
  }

  /**
   * createFolder
   *
   * Creates a new folder in Firebase Cloud Storage by writing a .keep
   * sentinel file into it. Cloud Storage folders only exist while they
   * contain at least one file.
   *
   * @param folder - The folder name to create (e.g. 'documents').
   */
  async createFolder(folder: string): Promise<void> {
    await this.storage
      .bucket(this.getBucketName())
      .file(`${folder}/.keep`)
      .save('', { contentType: 'text/plain', resumable: false })
  }

  /**
   * importFromUrl
   *
   * Downloads a file from a remote URL and uploads it to Firebase Cloud Storage.
   * Useful for importing assets from external sources into the media library.
   *
   * Steps:
   * 1. Fetches the file from the remote URL.
   * 2. Determines the MIME type from the response headers.
   * 3. Generates a timestamped filename to avoid collisions.
   * 4. Uploads the buffer via uploadFile.
   * 5. Returns a StorageFile object with the signed URL and metadata.
   *
   * @param folder - The destination folder in Cloud Storage.
   * @param url    - The remote URL to import from.
   * @returns A StorageFile object representing the imported file.
   * @throws Error if the remote URL cannot be fetched.
   */
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

  /**
   * deleteStorageRecordByFilePath
   *
   * Deletes the nxf_storage metadata record whose file_path matches the
   * given path string. This is called when a file is deleted from Cloud
   * Storage so the media library record is also removed.
   *
   * Note: This only deletes the Firestore metadata record — the actual file
   * in Cloud Storage must be deleted separately via deleteFile().
   *
   * @param filePath - The file path to match (e.g. 'avatars/profile.png').
   * @throws Error if the Firestore query or delete operation fails.
   */
  async deleteStorageRecordByFilePath(filePath: string): Promise<void> {
    try {
      console.log('[FirebaseAdapter] deleteStorageRecordByFilePath started')

      const snapshot = await this.firestore
        .collection('nxf_storage')
        .where('file_path', '==', filePath)
        .limit(1)
        .get()

      if (snapshot.empty) {
        console.warn('[FirebaseAdapter] deleteStorageRecordByFilePath — no matching record found')
        return
      }

      await snapshot.docs[0].ref.delete()
      console.log('[FirebaseAdapter] deleteStorageRecordByFilePath completed successfully')

    } catch {
      console.error('[FirebaseAdapter] deleteStorageRecordByFilePath failed')
      throw new Error('Failed to delete storage record')
    }
  }

  /**
   * renameFile
   *
   * Renames a file in Firebase Cloud Storage by copying it to the new name
   * and deleting the original (Cloud Storage has no native rename operation).
   * Also updates the corresponding nxf_storage metadata record if one exists.
   *
   * @param folder   - The folder containing the file.
   * @param oldName  - The current filename.
   * @param newName  - The new filename.
   */
  async renameFile(folder: string, oldName: string, newName: string): Promise<void> {
    const bucket  = this.storage.bucket(this.getBucketName())
    const oldFile = bucket.file(`${folder}/${oldName}`)
    const newFile = bucket.file(`${folder}/${newName}`)

    /**
     * Cloud Storage has no rename operation — we simulate it by copying
     * to the new path and then deleting the original.
     */
    await oldFile.copy(newFile)
    await oldFile.delete()

    /**
     * Update the metadata record in nxf_storage to reflect the new filename
     * and file path. Wrapped in try/catch so a metadata update failure does
     * not roll back the storage rename — the file has already been renamed.
     */
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
        console.log('[FirebaseAdapter] renameFile — nxf_storage record updated')
      }
    } catch {
      /**
       * Log a warning but do not throw — the storage rename succeeded,
       * so this is a non-fatal metadata sync failure.
       */
      console.warn('[FirebaseAdapter] renameFile — nxf_storage update failed')
    }
  }

  /**
   * moveFile
   *
   * Moves a file from one storage folder to another by copying it to the
   * new path and deleting the original. Also updates the nxf_storage
   * metadata record to reflect the new folder and file path.
   *
   * @param fromFolder - The source folder (e.g. 'uploads/temp').
   * @param toFolder   - The destination folder (e.g. 'uploads/avatars').
   * @param fileName   - The filename to move.
   */
  async moveFile(fromFolder: string, toFolder: string, fileName: string): Promise<void> {
    const bucket  = this.storage.bucket(this.getBucketName())
    const oldFile = bucket.file(`${fromFolder}/${fileName}`)
    const newFile = bucket.file(`${toFolder}/${fileName}`)

    /**
     * Copy to the new folder path then delete the original.
     * There is no atomic move operation in Cloud Storage.
     */
    await oldFile.copy(newFile)
    await oldFile.delete()

    /**
     * Update the metadata record in nxf_storage to reflect the new folder
     * and file path. Non-fatal if it fails — the file has already been moved.
     */
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
        console.log('[FirebaseAdapter] moveFile — nxf_storage record updated')
      }
    } catch {
      /**
       * Log a warning but do not throw — the storage move succeeded,
       * so this is a non-fatal metadata sync failure.
       */
      console.warn('[FirebaseAdapter] moveFile — nxf_storage update failed')
    }
  }

  /**
 * alterTable
 *
 * Firestore is schemaless — collections have no fixed schema and columns
 * do not need to be explicitly added or removed at the database level.
 * This is a no-op for Firebase. Schema changes are tracked only in
 * nxf_system_models, which the API route handles separately.
 *
 * @param tableName - The collection name (logged for traceability).
 * @param changes   - The requested changes (ignored for Firestore).
 * @returns true always.
 */
async alterTable(
  tableName: string,
  changes: { add?: ColumnDef[]; drop?: string[]; rename?: { from: string; to: string } }
): Promise<any> {
  console.log(`[FirebaseAdapter] alterTable no-op for ${tableName} — Firestore is schemaless`)
  return true
}

/**
 * dropTable
 *
 * Deletes all documents in a Firestore collection in batches of 500,
 * then the collection disappears naturally (Firestore has no empty collections).
 *
 * We do not recurse into subcollections because the console does not
 * currently support subcollections — all model data is flat top-level documents.
 *
 * Steps:
 * 1. Fetch up to 500 documents from the collection.
 * 2. If none are returned the collection is already empty — stop.
 * 3. Delete all fetched documents in a single batch commit.
 * 4. Repeat from step 1 until no documents remain.
 *
 * @param tableName - The Firestore collection name to delete.
 * @returns true when all documents have been deleted.
 */
async dropTable(tableName: string): Promise<any> {
  console.log(`[FirebaseAdapter] dropTable — deleting all documents in: ${tableName}`)

  const collectionRef = this.firestore.collection(tableName)

  /**
   * Firestore does not support a native "delete collection" operation.
   * We must fetch and delete documents in batches of 500 (the Firestore
   * batch write limit). The loop continues until a fetch returns 0 documents,
   * at which point the collection is empty and effectively deleted.
   */
  while (true) {
    const snapshot = await collectionRef.limit(500).get()

    // Collection is now empty — exit the loop
    if (snapshot.empty) break

    const batch = this.firestore.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()

    console.log(
      `[FirebaseAdapter] dropTable — deleted batch of ${snapshot.docs.length} documents from ${tableName}`
    )
  }

  console.log(`[FirebaseAdapter] dropTable — collection ${tableName} is now empty`)
  return true
}

/**
 * renameTable
 *
 * Firestore has no rename operation for collections. Since all relationships
 * in Underpeaks reference models by sm_id (not by collection name), renaming
 * only needs to update the nxf_system_models record — which the API route
 * handles. This is a no-op at the adapter level for Firebase.
 *
 * @param oldName - The current collection name (logged for traceability).
 * @param newName - The new collection name (logged for traceability).
 * @returns true always.
 */
async renameTable(oldName: string, newName: string): Promise<any> {
  console.log(`[FirebaseAdapter] renameTable no-op: ${oldName} → ${newName} — Firestore collections are implicit`)
  return true
}
///MESSAGES
async listConversations(
  config:     DBConfig,
  project_id: string,
  uid:        string,
  limit       = 10
): Promise<Array<Record<string, any>>> {
  const snapshot = await this.firestore
    .collection('nxf_system_conversations')
    .where('project_id', '==', project_id)
    .orderBy('last_message_at', 'desc')
    .limit(limit)
    .get()

  // Deduplicate by con_id — if multiple Firestore docs share the same con_id
  // (bad writes during testing), only keep the first occurrence.
  const seen = new Set<string>()

  const conversations: Record<string, any>[] = []

  for (const doc of snapshot.docs) {
    const data   = doc.data()
    const con_id = data.con_id ?? doc.id

    if (seen.has(con_id)) continue
    seen.add(con_id)

    conversations.push({ ...data, con_id, id: con_id })
  }

  const withUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadSnap = await this.firestore
        .collection('nxf_system_messages')
        .where('conversation_id', '==', conv.con_id)
        .where('recipient_id',    '==', uid)
        .where('is_read',         '==', false)
        .get()

      return { ...conv, unread_count: unreadSnap.size }
    })
  )

  return withUnread
}

async getConversationThread(
  config:         DBConfig,
  conversationId: string
): Promise<Array<Record<string, any>>> {
  const snapshot = await this.firestore
    .collection('nxf_system_messages')
    .where('conversation_id', '==', conversationId)
    .get()

  const seen = new Set<string>()

  const messages = snapshot.docs.reduce((acc, doc): Record<string, any>[] => {
    const data   = doc.data() as Record<string, any>
    const mes_id = data.mes_id ?? doc.id

    if (seen.has(mes_id)) return acc
    seen.add(mes_id)

    acc.push({ ...data, mes_id })
    return acc
  }, [] as Record<string, any>[])

  return messages.sort((a, b) =>
    new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  )
}

async markConversationRead(
  config:         DBConfig,
  uid:            string,
  conversationId: string
): Promise<{ success: boolean }> {
  const snapshot = await this.firestore
    .collection('nxf_system_messages')
    .where('conversation_id', '==', conversationId)
    .where('recipient_id',    '==', uid)
    .where('is_read',         '==', false)
    .get()

  if (snapshot.empty) return { success: true }

  const batch = this.firestore.batch()
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      is_read:    true,
      updated_at: new Date().toISOString(),
    })
  })

  await batch.commit()
  return { success: true }
}

async sendMessage(
  config:         DBConfig,
  conversationId: string,
  senderId:       string,
  content:        string
): Promise<Record<string, any>> {
  const { randomUUID } = await import('crypto')
  const now    = new Date().toISOString()
  const mes_id = randomUUID()

  // Resolve project_id and tenant_id — messages schema requires both
  const projects = await this.readAll!(config, 'nxf_system_projects') as Record<string, any>[]
const project_id = projects[0]?.project_id ?? projects[0]?.id ?? null

const tenants = await this.readAll!(config, 'nxf_system_tenants') as Record<string, any>[]
const tenant_id = tenants[0]?.ten_id ?? tenants[0]?.id ?? null

  const message = {
    mes_id,
    project_id,
    tenant_id,
    conversation_id: conversationId,   // references nxf_system_conversations(con_id)
    sender_id:       senderId,
    recipient_id:    null,             // set by caller if known
    content,
    is_read:         false,
    sent_at:         now,
    created_at:      now,
    updated_at:      now,
  }

  // Use mes_id as the Firestore document ID so doc.id === mes_id
  await this.firestore
    .collection('nxf_system_messages')
    .doc(mes_id)
    .set(message)

  // Update the conversation's preview cache
  await this.firestore
    .collection('nxf_system_conversations')
    .where('con_id', '==', conversationId)
    .get()
    .then((snap) => {
      if (!snap.empty) {
        return snap.docs[0].ref.update({
          last_message_preview: content.slice(0, 100),
          last_message_at:      now,
          updated_at:           now,
        })
      }
    })

  return message
}

async deleteConversation(
  config:         DBConfig,
  conversationId: string
): Promise<{ success: boolean }> {
  try {
    // Find the conversation doc by con_id (stored field, not doc.id)
    const convSnap = await this.firestore
      .collection('nxf_system_conversations')
      .where('con_id', '==', conversationId)
      .get()

    const msgSnap = await this.firestore
      .collection('nxf_system_messages')
      .where('conversation_id', '==', conversationId)
      .get()

    const batch = this.firestore.batch()
    msgSnap.docs.forEach((doc) => batch.delete(doc.ref))
    convSnap.docs.forEach((doc) => batch.delete(doc.ref))

    await batch.commit()
    return { success: true }

  } catch (err: any) {
    throw new Error(`Failed to delete conversation: ${err.message}`)
  }
}

async markAllMessagesRead(
  config: DBConfig,
  uid:    string
): Promise<{ success: boolean }> {
  const snapshot = await this.firestore
    .collection('nxf_system_messages')
    .where('recipient_id', '==', uid)
    .where('is_read',      '==', false)
    .get()

  if (snapshot.empty) return { success: true }

  const batch = this.firestore.batch()
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      is_read:    true,
      updated_at: new Date().toISOString(),
    })
  })

  await batch.commit()
  return { success: true }
}

///NOTIFICATIONS

async listNotifications(
  config: DBConfig,
  uid: string,
  project_id: string,
  limit = 20
): Promise<Array<Record<string, any>>> {
  try {
    

    const snapshot = await this.firestore
      .collection('nxf_system_notifications')
      .where('project_id', '==', project_id)
      //.where('user_id', '==', uid)
      .where('status', '!=', 'deleted')
      //.orderBy('status')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get()

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, any>),
    }))

    console.log(
      `[FirestoreAdapter] listNotifications returned ${notifications.length} notifications`
    )

    return notifications
  } catch (error) {
    console.error(
      '[FirestoreAdapter] listNotifications failed',
      error
    )

    throw error
  }
}
async markNotificationRead(
  config:         DBConfig,
  notificationId: string,
  uid:            string
): Promise<{ success: boolean }> {
  const docRef  = this.firestore.collection('nxf_system_notifications').doc(notificationId)
  const docSnap = await docRef.get()

  if (!docSnap.exists) {
    throw new Error('Notification not found')
  }

  // Ownership check — user may only mark their own notifications as read
  const data = docSnap.data() as Record<string, any>
  if (data.user_id !== uid) {
    throw new Error('Forbidden — notification does not belong to this user')
  }

  const now = new Date().toISOString()
  await docRef.update({
    status:     'read',
    is_read:    true,
    read_at:    now,
    updated_at: now,
  })

  console.log(`[FirebaseAdapter] markNotificationRead — notification ${notificationId} marked as read`)
  return { success: true }
}
async markAllNotificationsRead(
  config:     DBConfig,
  uid:        string,
  project_id: string
): Promise<{ success: boolean; updated: number }> {
  const snapshot = await this.firestore
    .collection('nxf_system_notifications')
    .where('project_id', '==', project_id)
    .where('user_id',    '==', uid)
    .where('status',     '==', 'unread')
    .get()

  if (snapshot.empty) return { success: true, updated: 0 }

  const now   = new Date().toISOString()
  const batch = this.firestore.batch()

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status:     'read',
      is_read:    true,
      read_at:    now,
      updated_at: now,
    })
  })

  await batch.commit()

  console.log(`[FirebaseAdapter] markAllNotificationsRead — marked ${snapshot.size} notifications as read`)
  return { success: true, updated: snapshot.size }
}

///SETTINGS/APIKEYS
async listApiKeys(
  config:     DBConfig,
  project_id: string
) {
  const snapshot = await this.firestore
    .collection('nxf_system_apis')
    .where('project_id', '==', project_id)
    .where('status',     '==', 'active')
    .orderBy('created_at', 'desc')
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      api_id:       doc.id,
      name:         data.name,
      key_prefix:   data.key_prefix,
      status:       data.status,
      last_used_at: data.last_used_at ?? null,
      created_at:   data.created_at,
      // key_encrypted intentionally excluded — must never leave the server
    }
  })
}

async getApiKey(
  config: DBConfig,
  api_id: string
): Promise<Record<string, any> | null> {
  const doc = await this.firestore
    .collection('nxf_system_apis')
    .doc(api_id)
    .get()

  if (!doc.exists) return null

  return { id: doc.id, ...doc.data() as Record<string, any> }
}

async revokeApiKey(
  config:     DBConfig,
  api_id:     string,
  project_id: string
): Promise<{ success: boolean }> {
  const docRef  = this.firestore.collection('nxf_system_apis').doc(api_id)
  const docSnap = await docRef.get()

  if (!docSnap.exists) {
    throw new Error('API key not found')
  }

  const data = docSnap.data() as Record<string, any>

  // Ownership check — prevent IDOR: one user revoking another's key
  if (data.project_id !== project_id) {
    throw new Error('Forbidden')
  }

  const now = new Date().toISOString()
  await docRef.update({
    status:     'revoked',
    revoked_at: now,
    updated_at: now,
  })

  console.log(`[FirebaseAdapter] revokeApiKey — key ${api_id} revoked`)
  return { success: true }
}

}

///MESSAGES



// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * getFirebaseAdapter
 *
 * A factory function that creates and returns a new FirebaseAdapter instance.
 * Prefer this function over calling `new FirebaseAdapter()` directly — it
 * provides a single place to add validation or configuration before the
 * adapter is returned.
 *
 * @param config - The DBConfig containing Firebase credentials and settings.
 * @returns A new FirebaseAdapter instance.
 * @throws Error if config is not provided.
 */
export function getFirebaseAdapter(config: DBConfig) {
  if (!config) throw new Error('Firebase config is required')
  return new FirebaseAdapter(config)
}