'use server';

import fs from 'fs/promises';
import path from 'path';
import { DBAdapter, DBConfig } from '@/app/db-adapter/types';
import { AuthService } from '@/app/(auth)/auth-service';
import { FirebaseAdapter } from '@/app/db-adapter/adapters/firebase-adapter';
import { PostgresAdapter } from '@/app/db-adapter/adapters/postgres-adapter';
import { MongoDBAdapter } from '@/app/db-adapter/adapters/mongodb-adapter';
import { SupabaseAdapter } from '@/app/db-adapter/adapters/supabase-adapter';
import { MySQLAdapter } from '@/app/db-adapter/adapters/mysql-adapter';

interface SigninInput {
  email?: string;
  password?: string;
  token?: string;
}

/**
 * Load DB config from nxt_flutter.config.json
 */
export async function loadConfig(): Promise<DBConfig> {
  const configPath = path.join(process.cwd(), 'nxt_flutter.config.json');

  console.log('📄 Loading installer config:', configPath);

  const file = await fs.readFile(configPath, 'utf-8');
  const parsed = JSON.parse(file);

  if (!parsed.dbConfig || !parsed.dbConfig.type) {
    throw new Error('dbConfig.type is missing in nxt_flutter.config.json');
  }

  return {
    type: parsed.dbConfig.type,
  };
}

/**
 * Merge installer config + env secrets
 */
export async function getFinalConfig(): Promise<DBConfig> {
  const baseConfig = await loadConfig();
  console.log('🔥 DB_FIREBASECONFIGJSON =', process.env.DB_FIREBASECONFIGJSON);

  if (baseConfig.type === 'firebase') {
    const firebaseJsonString = process.env.DB_FIREBASECONFIGJSON;
    console.log('🔥 DB_FIREBASECONFIGJSON =', process.env.DB_FIREBASECONFIGJSON);
    if (!firebaseJsonString) {
      throw new Error('DB_FIREBASECONFIGJSON missing');
    }

    let firebaseJson;
    try {
      firebaseJson = JSON.parse(firebaseJsonString);
    } catch {
      throw new Error('Invalid JSON in DB_FIREBASECONFIGJSON');
    }

    const storageBucket = process.env.DB_STORAGEURL;
    if (!storageBucket) {
      throw new Error('DB_STORAGEURL missing');
    }

    return {
      ...baseConfig,
      firebaseConfigJson: firebaseJson,
      storageBucket,
    };
  }

  return baseConfig;
}

/**
 * DB adapter factory
 */
function getAdapter(config: DBConfig): DBAdapter {
  switch (config.type) {
    case 'firebase':
      return new FirebaseAdapter(config);
    case 'postgres':
      return new PostgresAdapter(config);
    case 'mongodb':
      return new MongoDBAdapter(config);
    case 'supabase':
      return new SupabaseAdapter(config);
    case 'mysql':
      return new MySQLAdapter(config);
    default:
      throw new Error(`Unsupported DB type: ${config.type}`);
  }
}

/**
 * Unified signin
 */
export async function signin(input: SigninInput, config?: DBConfig) {
  try {
    const finalConfig = config || (await getFinalConfig());
    const adapter = getAdapter(finalConfig);
    const authService = new AuthService(adapter, finalConfig);

    if (adapter.supportsBuiltInAuth) {
      if (!input.token) return { error: 'Missing authentication token' };

      const sessionUser = await adapter.validateBuiltInSession?.(
        finalConfig,
        input.token
      );
      if (!sessionUser) return { error: 'Invalid or expired session' };

      const userId = sessionUser.uid || sessionUser.id;
      const project = await adapter.findProjectByOwnerId?.(
        finalConfig,
        userId
      );

      const tokens = await authService.issueTokens?.({
        userId,
        projectId: project?.id || null,
      });

      return {
        success: true,
        data: { userId, projectId: project?.id || null, tokens },
      };
    }

    const { email, password } = input;
    if (!email || !password) return { error: 'Email and password required' };

    const user = await adapter.findUserByEmail?.(finalConfig, email);
    if (!user) return { error: 'Invalid email or password.' };

    const valid = await adapter.comparePassword?.(
      password,
      user.password || user.password_hash
    );
    if (!valid) return { error: 'Invalid email or password.' };

    const project = await adapter.findProjectByOwnerId?.(
      finalConfig,
      user.user_id
    );

    const tokens = await authService.issueTokens?.({
      userId: user.user_id,
      projectId: project?.id || null,
    });

    return {
      success: true,
      data: {
        userId: user.user_id,
        projectId: project?.id || null,
        tokens,
      },
    };
  } catch (err: any) {
    console.error('❌ Signin failed:', err);
    return {
      error: err?.message || 'Internal server error',
    };
  }
}
