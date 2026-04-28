import { NextResponse } from 'next/server';
import { getAdapter } from '@/app/db-adapter';
import { DBConfig } from '@/app/db-adapter/types';
import crypto from 'crypto';

const IV_LENGTH = 16;

function deriveEncryptionKey({
  projectId,
  configId,
  userId,
  createdAt,
}: {
  projectId: string;
  configId: string;
  userId: string;
  createdAt: string;
}) {
  const rawKey = projectId + configId + userId + createdAt;
  return crypto.createHash('sha256').update(rawKey).digest();
}

function encrypt(data: any, key: Buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);

  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

function getMissingFields(fields: Record<string, any>) {
  return Object.entries(fields)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key);
}

export async function POST(req: Request) {
  try {
    const {
      projectName,        // ✅ ADDED
      selectedStack,
      selectedDb,
      dbConfig,
      adminUser,
      featureFlags = {},
      selectedProjectType,
      branding = {},
    } = await req.json();

    const requirePassword = !['supabase', 'firebase', 'mongodb', 'mysql', 'postgres'].includes(selectedDb);

    const missingFields = getMissingFields({
      selectedStack,
      selectedDb,
      dbConfig,
      adminUserEmail: adminUser?.email,
      ...(requirePassword && { adminUserPassword: adminUser?.password }),
      selectedProjectType,
    });

    if (missingFields.length > 0) {
      console.error('[SAVE CONFIG] Missing fields:', missingFields);
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
          received: {
            selectedStack,
            selectedDb,
            hasDbConfig: !!dbConfig,
            adminUser: {
              email: adminUser?.email ?? null,
              hasPassword: !!adminUser?.password,
            },
            selectedProjectType,
          },
        },
        { status: 400 }
      );
    }

    const adapter = getAdapter(selectedDb, dbConfig as DBConfig);

    if (!adapter.findUserByEmailWithRetry || !adapter.createAdminUser) {
      return NextResponse.json(
        { error: 'Adapter does not support required methods' },
        { status: 400 }
      );
    }

    let user = await adapter.findUserByEmailWithRetry(adapter.config, adminUser.email);

    if (!user?.user_id && !user?.id) {
      const userId = crypto.randomUUID();
      await adapter.createAdminUser(adapter.config, {
        user_id: userId,
        user_email: adminUser.email,
        password: adminUser.password ?? '',
        full_name: adminUser.full_name,
        role: 'admin',
      });

      user = await adapter.findUserByEmailWithRetry(adapter.config, adminUser.email);
    }

    const userId = user.user_id || user.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Admin user could not be created or found' },
        { status: 404 }
      );
    }

    let project = await adapter.findProjectByOwnerId!(adapter.config, userId);

    if (!project?.project_id && !project?.id) {
      const projectId = await adapter.createProject!(adapter.config, {
        name: projectName || `${adminUser.full_name}'s Project`, // ✅ UPDATED
        user_id: userId,
      });

      project = { project_id: projectId };
    }

    const projectId = project.project_id || project.id;

    const createdAt = new Date().toISOString();
    const configIdForKey = crypto.randomUUID();

    const encryptionKey = deriveEncryptionKey({
      projectId,
      configId: configIdForKey,
      userId,
      createdAt,
    });

    const encryptedDbConfig = encrypt(dbConfig, encryptionKey);

    const safeBranding = {
      logo_url: branding?.logoUrl || '',
      favicon_url: branding?.faviconUrl || '/images/favicon/NXT_Flutter_favicon.png',
      primary_color: branding?.primaryColor || '#000000',
    };

    const configId = await adapter.saveInstallerConfig!(adapter.config, {
      config_id: configIdForKey,
      project_id: projectId,
      project_name: projectName || `${adminUser.full_name}'s Project`, // ✅ ADDED
      user_id: userId,
      deployment_type: 'self_hosted',
      status: 'configured',
      selected_stack: selectedStack,
      selected_db: selectedDb,
      selected_project_type: selectedProjectType,
      db_config: encryptedDbConfig,
      admin_user: {
        email: adminUser.email,
        full_name: adminUser.full_name,
        user_id: userId,
        ...(requirePassword && { password: adminUser.password }),
      },
      feature_flags: featureFlags,
      branding: safeBranding,
      generator_version: '1.0.0',
      is_active: true,
      created_at: createdAt,
      updated_at: createdAt,
    });

    return NextResponse.json({
      success: true,
      project_id: projectId,
      config_id: configId,
    });
  } catch (err: any) {
    console.error('[SAVE CONFIG ERROR]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal Server Error' },
      { status: 500 }
    );
  }
}