import crypto from 'crypto';
import { getAdapter } from '../index';
import { DBConfig } from '../types';

export async function createAdminUserFlow(
  config: DBConfig,
  adminUser: { email: string; password: string; fullName: string },
  projectName: string,
  subdomain: string
) {
  // ---------------------------------------------------------------------------
  // Guard: Validate required fields
  // ---------------------------------------------------------------------------

  if (!adminUser.email || !adminUser.password) {
    throw new Error('Admin user must have email and password');
  }

  // ---------------------------------------------------------------------------
  // Adapter setup
  // ---------------------------------------------------------------------------

  const adapter = getAdapter(config.type, config);
  if (!adapter) throw new Error(`No adapter found for DB type: ${config.type}`);

  // ---------------------------------------------------------------------------
  // Initial variable declarations
  // ---------------------------------------------------------------------------

  let authUserId: string = crypto.randomUUID();
  let project_id = '';
  let tenantId   = '';

  // ---------------------------------------------------------------------------
  // Step 1: Ensure the user exists in the Auth system
  // ---------------------------------------------------------------------------

  let existingAuthUser = adapter.findUserByEmail
    ? await adapter.findUserByEmail(config, adminUser.email)
    : null;

  if (existingAuthUser) {
    // FIX: also check user_id — MongoDB stores the ID as user_id not id/uid
    authUserId = existingAuthUser.user_id || existingAuthUser.id || existingAuthUser.uid || authUserId;
    console.log('[createAdminUserFlow] Existing auth user found:', authUserId);
  } else if (adapter.registerUserInAuth) {
    const authUser = await adapter.registerUserInAuth(config, {
      email:     adminUser.email,
      password:  adminUser.password,
      full_name: adminUser.fullName,
    });
    // FIX: also check user_id for MongoDB
    authUserId = authUser.id  || authUser.uid || authUserId;
    console.log('[createAdminUserFlow] New auth user created:', authUserId);
  }

  // ---------------------------------------------------------------------------
  // Step 2: Ensure the user exists in the application DB (users table)
  // ---------------------------------------------------------------------------

  const existingDbUser = await adapter.findUserByEmail!(config, adminUser.email)

  if (!existingDbUser) {
    console.log('[createAdminUserFlow] Creating admin user in DB')
    await adapter.createAdminUser!(config, {
      user_id:      authUserId,
      user_email:   adminUser.email,
      full_name:    adminUser.fullName,
      password:     adminUser.password,
      role:         'admin',
      created_at:   new Date(),
      is_logged_in: false,
      last_login:   null,
    });
  } else {
    // FIX: also check user_id for MongoDB
    console.log('[createAdminUserFlow] User already in DB:', existingDbUser?.user_id || existingDbUser?.id || existingDbUser?.uid)
  }

  // ---------------------------------------------------------------------------
  // Step 3: Ensure a Tenant is linked to this admin
  // ---------------------------------------------------------------------------

  console.log('[createAdminUserFlow] Resolving tenant')

  const existingTenant = adapter.findTenantByUserEmail
    ? await adapter.findTenantByUserEmail(config, adminUser.email)
    : null;

  if (existingTenant) {
    tenantId = existingTenant.ten_id || existingTenant.id;
    console.log('[createAdminUserFlow] Existing tenant found:', tenantId);
  } else if (adapter.createTenant) {
    tenantId = await adapter.createTenant(config, {
      subdomain:  subdomain || 'console',
      user_email: adminUser.email,
      user_id:    authUserId,
    });
    console.log('[createAdminUserFlow] New tenant created:', tenantId);
  }

  // ---------------------------------------------------------------------------
  // Step 4: Ensure a Project is linked to this admin
  // ---------------------------------------------------------------------------

  console.log('[createAdminUserFlow] Resolving project')

  const existingProject = adapter.findProjectByOwnerId
    ? await adapter.findProjectByOwnerId(config, authUserId)
    : null;

  if (existingProject) {
    project_id = existingProject.project_id || existingProject.id;
    console.log('[createAdminUserFlow] Existing project found:', project_id);
  } else if (adapter.createProject) {
    // Uses tenantId resolved in Step 3 — safe, always set before this point
    project_id = await adapter.createProject(config, {
      name:      projectName || 'defaultproject',
      user_id:   authUserId,
      tenant_ID: tenantId,
    });
    console.log('[createAdminUserFlow] New project created:', project_id);
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return { authUserId, project_id, tenantId };
}