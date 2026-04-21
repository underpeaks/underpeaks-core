import { MongoClient, Db, ObjectId } from 'mongodb'
import { ColumnDef, DBAdapter, DBConfig } from '../types'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { CreateUserDataModels } from '../utils/create-data-models'
import { use } from 'react'

const DEFAULT_BUCKETS = ['system', 'themes', 'extensions', 'projects', 'avatars', 'logos', 'uploads']

export class MongoDBAdapter implements DBAdapter {
  supportsBuiltInAuth = false

  private _config: DBConfig
  private client: MongoClient
  private db?: Db

  constructor(config: DBConfig) {
    if (!config.connectionString) throw new Error('[MongoDBAdapter] connectionString is required')
    this._config = config
    this.client = new MongoClient(config.connectionString)
   
  }

  get config(): DBConfig {
    return this._config
  }

 private async getDb(): Promise<Db> {
  if (!this.db) {
    await this.client.connect()

    if (!this._config.databaseName) {
      throw new Error('[MongoDBAdapter] Missing database name in config')
    }

    this.db = this.client.db(this._config.databaseName)
     console.log(this.db.databaseName);
  }

  return this.db
}

  async testConnection() {
    try {
      await this.client.connect()
      await this.client.db().command({ ping: 1 })
      return { success: true, message: 'Connected to MongoDB successfully.' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to connect to MongoDB.' }
    }
  }

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10)
  }

  async comparePassword(password: string, hash: string) {
    console.log(password);
    console.log(hash);
    return bcrypt.compare(password, hash)
  }

  async create(config: DBConfig, collection: string, data: any): Promise<string> {
    const db = await this.getDb()
    const res = await db.collection(collection).insertOne(data)
    return res.insertedId.toString()
  }

  async read(config: DBConfig, collection: string, query: any = {}) {
    const db = await this.getDb()
    return db.collection(collection).find(query).toArray()
  }

  async update(config: DBConfig, collection: string, id: string, data: any) {
    const db = await this.getDb()
    await db.collection(collection).updateOne({ _id: new ObjectId(id) }, { $set: data })
    return true
  }

  async delete(config: DBConfig, collection: string, id: string) {
    const db = await this.getDb()
    await db.collection(collection).deleteOne({ _id: new ObjectId(id) })
    return true
  }

  // ---------------- USER HELPERS ----------------
  async createAdminUser(config: DBConfig, data: any) {
    const { user_id, user_email, password, role = 'admin', ...rest } = data
    if (!user_email || !password) throw new Error('Admin user must have email and password')

    const hashed = await this.hashPassword(password)

    return this.create(config, 'nxf_users', {
      user_id: user_id || crypto.randomUUID(),
      user_email,
      password_hash: hashed,
      full_name: rest.full_name || null,
      role,
      status: 'active',
      email_verified: true,
      token: null,
      token_ttl: null,
      notes: rest.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...rest,
    })
  }

async findUserByEmail(config: DBConfig, email: string) {
  const db = await this.getDb()

  const normalizedEmail = email.trim().toLowerCase()

  const user = await db.collection('nxf_users').findOne({
    $expr: {
      $eq: [{ $toLower: '$user_email' }, normalizedEmail],
    },
  })

  return user || null
}

  async findUserByEmailWithRetry(config: DBConfig, email: string, retries = 5, delay = 300) {
    for (let i = 0; i < retries; i++) {
      const user = await this.findUserByEmail(config, email)
      console.log(user);
      if (user) return user
      await new Promise(r => setTimeout(r, delay))
    }
    return null
  }

  async loginBasic(config: DBConfig, email: string, password: string) {
    console.log("FINDING USER")
    const user = await this.findUserByEmail(config, email)
   console.log("FOUND USER" );
   console.log(user);
    if (!user) return { success: false, error: 'Invalid email or password' }
    console.log("USER CHECK PASSED" );
    if (!user.email_verified) return { success: false, error: 'Please verify your email before logging in' }
console.log("EMAIL CHECK PASSED" );
console.log(password);
console.log(user.password_hash);
    const valid = await this.comparePassword( password, user.password_hash)
 console.log("PASSWORD CHECK" );
 console.log(valid);
    if (!valid) return { success: false, error: 'Invalid email or password' }
    console.log("PASSWORD CHECK PASSED" );
console.log("USER COMPLETE PASSED" );
    return {
      success: true,
      user: {
        user_id: user.user_id,
        email: user.user_email,
        full_name: user.full_name,
        role: user.role || 'user',
        status: user.status || 'active',
      },
    }
  }

  // ---------------- PASSWORD RESET HELPERS ----------------
 async createPasswordResetToken(email: string) {
  if (!email) throw new Error('Email is required')

  const db = await this.getDb()
  const normalizedEmail = email.trim().toLowerCase()

  // Look for user using case-insensitive comparison with $expr and $toLower
  const user = await db.collection('nxf_users').findOne({
    $expr: { $eq: [{ $toLower: '$user_email' }, normalizedEmail] }
  })

  if (!user) {
    const allUsers = await db.collection('nxf_users').find({}, { projection: { user_email: 1 } }).toArray()
    console.log('User not found for forgot password. Emails in DB:', allUsers.map(u => u.user_email))
    throw new Error('User not found')
  }

  const token = crypto.randomBytes(32).toString('hex')
  const ttl = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.collection('nxf_users').updateOne(
    { _id: user._id },
    { $set: { token, token_ttl: ttl.toISOString(), updated_at: new Date().toISOString() } }
  )

  return token
}






  async findUserByToken(token: string) {
    const db = await this.getDb()
    const user = await db.collection('nxf_users').findOne({
      token,
      token_ttl: { $gt: new Date().toISOString() },
    })
    return user || null
  }

  async updatePasswordByToken(token: string, newPassword: string) {
  if (!token) throw new Error('Token is required')

  const db = await this.getDb()
  const now = new Date().toISOString()

  // 1️⃣ Find the user with valid token
  const user = await db.collection('nxf_users').findOne({
    token,
    token_ttl: { $gt: now } // must not be expired
  })

  if (!user) throw new Error('Invalid or expired token')

  // 2️⃣ Hash new password
  //const hashed = await this.hashPassword(newPassword)

  // 3️⃣ Update password and clear token
  await db.collection('nxf_users').updateOne(
    { _id: user._id },
    {
      $set: {
        password_hash: newPassword,
        token: null,
        token_ttl: null,
        updated_at: now,
      },
    }
  )

  // ✅ 4️⃣ Return success immediately
  return { success: true }
}

  // ---------------- LOGIN WITH TOKEN ----------------
  async loginWithMongo(
  config: DBConfig,
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
) {
  const basicLogin = await this.loginBasic(config, email, password);
  if (!basicLogin.success || !basicLogin.user) 
    return { success: false, error: basicLogin.error };

  // Only admins can access the console
  if (basicLogin.user.role !== "admin") {
    return {
      success: false,
      error: "You do not have admin rights to access the console",
      user: basicLogin.user,
    };
  }

  const project = await this.findProjectByOwnerId(config, basicLogin.user.user_id);
  if (!project) return { success: false, error: "No project found for user" };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const tokenId = crypto.randomUUID();

  await this.create(config, "nxf_system_tokens", {
    token_id: tokenId,
    user_id: basicLogin.user.user_id,
    project_id: project.project_id,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_at: expiresAt.toISOString(),
    refresh_expires_at: refreshExpiresAt.toISOString(),
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    revoked: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  });

  return {
    success: true,
    user: basicLogin.user,
    accessToken,
    refreshToken,
    projectId: project.project_id,
  };
}


  async registerMongoUser(config: DBConfig, data: { email: string; password: string; full_name?: string }) {
    const { email, password, full_name } = data
    if (!email || !password) throw new Error('Email and password are required')

    const existing = await this.findUserByEmail(config, email)
    if (existing) throw new Error('User already exists')

    const user_id = crypto.randomUUID()
    const password_hash = await this.hashPassword(password)
    const emailToken = crypto.randomBytes(32).toString('hex')
    const emailTTL = new Date(Date.now() + 1000 * 60 * 60 * 24)

    await this.create(config, 'nxf_users', {
      user_id,
      user_email: email,
      password_hash,
      full_name: full_name || null,
      role: 'user',
      status: 'active',
      email_verified: false,
      token: emailToken,
      token_ttl: emailTTL.toISOString(),
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const project_id = await this.createProject(config, { name: `${full_name || email}'s Project`, user_id })
    return { success: true, user_id, project_id, token: emailToken }
  }

 async verifyEmail(
  config: DBConfig,
  { token, email }: { token: string; email: string }
) {
  console.log("REACH 1")
  if (!token) throw new Error('Verification token required')
console.log("REACH 2")
  const db = await this.getDb()
console.log("REACH 3")
  const cleanToken = token.trim()
console.log("REACH 4")
  console.log('🔍 VERIFY TOKEN:', cleanToken)
console.log("REACH 5")
  const user = await db.collection('nxf_users').findOne({
    token: cleanToken,
  })
console.log("REACH 6")
  if (!user) {
    console.log("REACH 7")
    const debugUsers = await db.collection('nxf_users')
      .find({}, { projection: { user_email: 1, token: 1 } })
      .toArray()
console.log("REACH 8")
    console.log('❌ TOKEN NOT FOUND. USERS:', debugUsers)

    throw new Error('Invalid verification token')
  }
console.log("REACH 9")
  if (user.token_ttl && new Date(user.token_ttl) < new Date()) {
    throw new Error('Verification token expired')
  }
console.log("REACH 10")
  await db.collection('nxf_users').updateOne(
    { _id: user._id },
    {
      $set: {
        email_verified: true,
        token: null,
        token_ttl: null,
        updated_at: new Date().toISOString(),
      },
    }
  )
console.log("REACH 11")
  console.log('✅ EMAIL VERIFIED:', user.user_email)
console.log("REACH 12")
  return { success: true }
}

  async resendVerificationEmail(config: DBConfig, email: string) {
    const user = await this.findUserByEmail(config, email)
    if (!user) throw new Error('User not found')
    if (user.email_verified) throw new Error('Email already verified')

    const newToken = crypto.randomBytes(32).toString('hex')
    const newTTL = new Date(Date.now() + 1000 * 60 * 60 * 24)

    const db = await this.getDb()
    await db.collection('nxf_users').updateOne(
      { _id: user._id },
      {
        $set: {
          token: newToken,
          token_ttl: newTTL.toISOString(),
          updated_at: new Date().toISOString(),
        },
      }
    )

    return { success: true, token: newToken }
  }

  // ---------------- TOKEN HELPERS ----------------
  async findTokenByAccessToken(accessToken: string) {
    if (!accessToken) return null
    const db = await this.getDb()
    return db.collection('nxf_system_tokens').findOne({ access_token: accessToken })
  }

  async findTokenByRefreshToken(refreshToken: string) {
    if (!refreshToken) return null
    const db = await this.getDb()
    return db.collection('nxf_system_tokens').findOne({ refresh_token: refreshToken })
  }

  async extendToken(tokenId: string, data: Partial<{ expires_at: string; updated_at: string }>) {
    if (!tokenId) throw new Error('Token ID is required')
    const db = await this.getDb()
    await db.collection('nxf_system_tokens').updateOne({ token_id: tokenId }, { $set: data })
    return true
  }

  // ---------------- PROJECTS ----------------
  async createProject(config: DBConfig, data: { name: string; user_id: string }) {
    const project_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_projects', { project_id, name: data.name, user_id: data.user_id, created_at: new Date().toISOString() })
    return project_id
  }

  async findProjectByOwnerId(config: DBConfig, ownerId: string) {
    return (await this.read(config, 'nxf_system_projects', { user_id: ownerId }))[0] || null
  }

  // ---------------- TENANTS ----------------
  async createTenant(config: DBConfig, data: { subdomain: string; user_email: string }) {
    const ten_id = crypto.randomUUID()
    await this.create(config, 'nxf_system_tenants', { ten_id, subdomain: data.subdomain, user_email: data.user_email, created_at: new Date().toISOString() })
    return ten_id
  }

  async findTenantByUserEmail(config: DBConfig, email: string) {
    return (await this.read(config, 'nxf_system_tenants', { user_email: email }))[0] || null
  }

  // ---------------- INSTALLER CONFIG ----------------
  async saveInstallerConfig(config: DBConfig, data: any) {
    return this.create(config, 'nxf_system_config', { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
  }

  // ---------------- TABLE CREATION ----------------
  async createTable(
    tableName: string,
    schema: { columns: ColumnDef[] | Record<string, Omit<ColumnDef, 'name'>> }
  ) {
    const db = await this.getDb()

   

    const exists = await db.listCollections({ name: tableName }).toArray()
    if (!exists.length) await db.createCollection(tableName)

    const columnsArray: ColumnDef[] = Array.isArray(schema.columns)
      ? schema.columns
      : Object.entries(schema.columns).map(([name, def]: any) => ({
          name,
          ...def,
        }))

    for (const col of columnsArray) {
      if (col.unique || col.is_primary) {
        await db.collection(tableName).createIndex(
          { [col.name]: 1 },
          { unique: true }
        )
      }
    }
  }


  // ---------------- DATA MODELS ----------------
 async CreateDataModels(projectId: string,selectedProjectType:string) {
  return CreateUserDataModels(this, projectId,selectedProjectType,[]);
}

async createDataModelsFromUserEmail(email: string,selectedProjectType:string) {
  if (!email) throw new Error('Missing User Email');

  const user = await this.findUserByEmail(this.config, email);
  if (!user?.user_id) throw new Error('User not found');

  const project = await this.findProjectByOwnerId(this.config, user.user_id);
  if (!project?.project_id) throw new Error('Project not found');

  return this.CreateDataModels(project.project_id,selectedProjectType);
}

  // ---------------- STORAGE ----------------
  async setupStorageBuckets() {
    const db = await this.getDb()
    const exists = (await db.listCollections({ name: 'nxf_storage' }).toArray()).length
    if (!exists) await db.createCollection('nxf_storage')
    return { success: true, buckets: DEFAULT_BUCKETS }
  }

async installDemoContent(
  config: DBConfig,
  selectedProjectType: string
): Promise<{
  success: boolean;
  message?: string;
  inserted?: number;
  skipped?: boolean;
}> {
  try {
    const db = await this.getDb();

    const fs = require("fs");
    const path = require("path");

    // ✅ match other adapters
    const modelFolders = [
      `${selectedProjectType}_models`,
      "system_models",
      "users_models",
    ];

    const basePaths = modelFolders.map((folder) =>
      path.resolve(process.cwd(),"..", "demo_content", folder)
    );

    let inserted = 0;

    for (const basePath of basePaths) {
      console.log("CHECKING PATH =", basePath);

      if (!fs.existsSync(basePath)) {
        console.log("SKIP (missing folder):", basePath);
        continue;
      }

      const files = fs
        .readdirSync(basePath)
        .filter((f: string) => f.endsWith(".json"));

      if (!files.length) {
        console.log("NO FILES IN:", basePath);
        continue;
      }

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

        // ✅ support both formats
        const rows = Array.isArray(json) ? json : json?.demo_data;

        if (!rows || !Array.isArray(rows)) {
          console.log(`SKIPPING ${file} (no valid data array)`);
          continue;
        }

        console.log(
          `📦 Inserting into ${collectionName} -> ${rows.length} docs`
        );

        const collection = db.collection(collectionName);

        if (rows.length > 0) {
          try {
            const result = await collection.insertMany(rows, {
              ordered: false, // ✅ prevents full failure on one bad doc
            });

            inserted += result.insertedCount || 0;
          } catch (err: any) {
            console.log(
              `FAILED INSERT ${collectionName}:`,
              err.message
            );

            // still count partial success
            if (err.result?.nInserted) {
              inserted += err.result.nInserted;
            }
          }
        }
      }
    }

    return {
      success: true,
      inserted,
      skipped: false,
      message: "Demo content installed successfully",
    };
  } catch (err: any) {
    console.error("MONGO DEMO INSTALL ERROR:", err);

    return {
      success: false,
      message: err.message || "Failed to install demo content",
      inserted: 0,
      skipped: true,
    };
  }
}
  
}
