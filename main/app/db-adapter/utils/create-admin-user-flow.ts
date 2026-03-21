import crypto from 'crypto';
import { getAdapter } from '../index';
import { DBConfig } from '../types';

export async function createAdminUserFlow(
  config: DBConfig,
  adminUser: { email: string; password: string; fullName: string },
  projectName: string,
  subdomain: string
) {
  if (!adminUser.email || !adminUser.password) {
    throw new Error('Admin user must have email and password');
  }

  const adapter = getAdapter(config.type, config);
  if (!adapter) throw new Error(`No adapter found for DB type: ${config.type}`);

  let authUserId: string = crypto.randomUUID();
  let project_id = '';
  let tenantId = '';

  console.log('🔑 Admin Email:', adminUser.email);
  console.log('Admin FULL NAME: ',adminUser.fullName);

  // 1️⃣ Ensure user in Supabase Auth
  let existingAuthUser = adapter.findUserByEmail
    ? await adapter.findUserByEmail(config, adminUser.email)
    : null;

  if (existingAuthUser) {
    authUserId = existingAuthUser.id || existingAuthUser.uid || authUserId;
    console.log("EXISTING  IN AUTH API HIT");
    console.log('✅ Existing auth user found:', authUserId);
  } else if (adapter.registerUserInAuth) {
    console.log("REGISTER  IN AUTH API HIT");
    const authUser = await adapter.registerUserInAuth(config, {
      email: adminUser.email,
      password: adminUser.password,
      full_name: adminUser.fullName, // 👈 pass to user_metadata
    });
    authUserId = authUser.id || authUser.uid || authUserId;
    console.log('✅ Created new auth user:', authUserId);
  }

  // 2️⃣ Ensure user in DB users
  const existingDbUser = adapter.findUserByEmail
    ? await adapter.findUserByEmail(config, adminUser.email)
    : null;

  if (!existingDbUser && adapter.createAdminUser) {
    console.log('🆕 Creating admin user in DB...');
   
    await adapter.createAdminUser(config, {
      user_id: authUserId,
      user_email: adminUser.email,
      full_name: adminUser.fullName,
      password: adminUser.password,
      role: 'admin',
      created_at: new Date(),
      is_logged_in:false,
      last_login:null

    });
  } else {
    console.log('ℹ️ User already exists in DB:', existingDbUser?.id || existingDbUser?.uid);
  }

  // 3️⃣ Ensure Project
  const existingProject = adapter.findProjectByOwnerId
    ? await adapter.findProjectByOwnerId(config, authUserId)
    : null;

  if (existingProject) {
    project_id = existingProject.id || existingProject.project_id;
    console.log('📂 Found existing project:', project_id);
  } else if (adapter.createProject) {
    project_id = await adapter.createProject(config, {
      name: projectName || 'defaultproject',
      user_id: authUserId,
    });
    console.log('📂 Created new project:', project_id);
  }

  // 4️⃣ Ensure Tenant
  const existingTenant = adapter.findTenantByUserEmail
    ? await adapter.findTenantByUserEmail(config, adminUser.email)
    : null;

  if (existingTenant) {
    tenantId = existingTenant.id || existingTenant.ten_id;
    console.log('🏢 Found existing tenant:', tenantId);
  } else if (adapter.createTenant) {
    tenantId = await adapter.createTenant(config, {
      subdomain: subdomain || 'console',
      user_email: adminUser.email,
    });
    console.log('🏢 Created new tenant:', tenantId);
  }

  return { authUserId, project_id, tenantId };
}
