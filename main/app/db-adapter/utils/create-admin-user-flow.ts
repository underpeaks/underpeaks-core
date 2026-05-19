/**
 * createAdminUserFlow
 *
 * This is the main "setup" function that runs whenever a new admin account
 * needs to be provisioned. Think of it as an automated checklist that makes
 * sure every piece of the admin's environment exists before the app lets
 * them in.
 *
 * What it does (in order):
 * 1. Validates that the required admin credentials are present.
 * 2. Retrieves the correct database adapter for the configured DB type.
 * 3. Ensures the admin exists in the authentication system (Auth).
 * 4. Ensures the admin exists in the application database (DB users table).
 * 5. Ensures a Project is linked to this admin.
 * 6. Ensures a Tenant (subdomain workspace) is linked to this admin.
 * 7. Returns the IDs of all three created/found resources.
 *
 * @param config       - Database configuration object (type, connection details, etc.)
 * @param adminUser    - The admin's credentials: email, password, and display name.
 * @param projectName  - The name to give the project if one doesn't exist yet.
 * @param subdomain    - The subdomain to assign to the tenant if one doesn't exist yet.
 *
 * @returns An object containing:
 *   - authUserId  — The UUID of the user in the Auth system.
 *   - project_id  — The ID of the linked project.
 *   - tenantId    — The ID of the linked tenant.
 *
 * @throws If email or password are missing.
 * @throws If no database adapter is found for the given DB type.
 */

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

  /**
   * We cannot proceed without both an email and a password.
   * Throwing early here prevents confusing errors deeper in the flow.
   */
  if (!adminUser.email || !adminUser.password) {
    throw new Error('Admin user must have email and password');
  }

  // ---------------------------------------------------------------------------
  // Adapter setup
  // ---------------------------------------------------------------------------

  /**
   * getAdapter returns a database-specific driver (e.g. Supabase, PostgreSQL).
   * It uses config.type to decide which adapter to load.
   * If the type is unknown, we throw immediately rather than failing silently later.
   */
  const adapter = getAdapter(config.type, config);
  if (!adapter) throw new Error(`No adapter found for DB type: ${config.type}`);

  // ---------------------------------------------------------------------------
  // Initial variable declarations
  // ---------------------------------------------------------------------------

  /**
   * authUserId — Will hold the UUID of the user in the Auth system.
   * We generate a fallback UUID here in case the auth system doesn't
   * return one (edge case, but safe to handle).
   */
  let authUserId: string = crypto.randomUUID();

  /** project_id — Will be populated in Step 3. */
  let project_id = '';

  /** tenantId — Will be populated in Step 4. */
  let tenantId = '';

  // ---------------------------------------------------------------------------
  // Step 1: Ensure the user exists in the Auth system
  // ---------------------------------------------------------------------------

  /**
   * We first check if this email already has an account in the Auth system.
   * - If yes  → we reuse their existing auth ID.
   * - If no   → we register them as a new auth user.
   *
   * `adapter.findUserByEmail` may be undefined for adapters that don't support
   * direct user lookup, so we guard with a conditional before calling it.
   */
  let existingAuthUser = adapter.findUserByEmail
    ? await adapter.findUserByEmail(config, adminUser.email)
    : null;

  if (existingAuthUser) {
    /**
     * The user already has an Auth account.
     * Pull their ID from whichever field the adapter returns (id or uid).
     * Fall back to our generated UUID if neither is present.
     */
    authUserId = existingAuthUser.id || existingAuthUser.uid || authUserId;
    console.log('logs.existingAuthUserFound', authUserId);
  } else if (adapter.registerUserInAuth) {
    /**
     * No existing Auth user found — register them now.
     * We pass full_name via user_metadata so the Auth provider can store it
     * alongside the core credentials.
     */
    const authUser = await adapter.registerUserInAuth(config, {
      email: adminUser.email,
      password: adminUser.password,
      full_name: adminUser.fullName,
    });
    authUserId = authUser.id || authUser.uid || authUserId;
    console.log('logs.newAuthUserCreated', authUserId);
  }

  // ---------------------------------------------------------------------------
  // Step 2: Ensure the user exists in the application DB (users table)
  // ---------------------------------------------------------------------------

  /**
   * The Auth system and the application DB are separate stores.
   * A user can exist in Auth but not yet have a record in our own DB.
   * We check again by email and create the DB record if it's missing.
   */
  const existingDbUser = adapter.findUserByEmail
    ? await adapter.findUserByEmail(config, adminUser.email)
    : null;

  if (!existingDbUser && adapter.createAdminUser) {
    /**
     * No DB record found — create one now.
     * We write all the fields needed by the application layer, including
     * role, login state, and timestamps.
     */
    console.log('logs.creatingAdminInDb');
    await adapter.createAdminUser(config, {
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
    /**
     * A DB record already exists — nothing to create.
     * Log the existing user's ID for traceability.
     */
    console.log('logs.userAlreadyInDb', existingDbUser?.id || existingDbUser?.uid);
  }

  // ---------------------------------------------------------------------------
  // Step 3: Ensure a Project is linked to this admin
  // ---------------------------------------------------------------------------

  /**
   * Every admin must own at least one project.
   * We search by the admin's Auth user ID:
   * - Found   → reuse the existing project ID.
   * - Not found → create a new project with the provided name (or a default).
   */
  const existingProject = adapter.findProjectByOwnerId
    ? await adapter.findProjectByOwnerId(config, authUserId)
    : null;

  if (existingProject) {
    project_id = existingProject.id || existingProject.project_id;
    console.log('logs.existingProjectFound', project_id);
  } else if (adapter.createProject) {
    project_id = await adapter.createProject(config, {
      name:    projectName || 'defaultproject',
      user_id: authUserId,
    });
    console.log('logs.newProjectCreated', project_id);
  }

  // ---------------------------------------------------------------------------
  // Step 4: Ensure a Tenant is linked to this admin
  // ---------------------------------------------------------------------------

  /**
   * A Tenant represents the admin's isolated workspace, identified by a
   * subdomain (e.g. "acme" → acme.yourapp.com).
   * We search by email:
   * - Found   → reuse the existing tenant ID.
   * - Not found → create a new tenant with the provided subdomain (or 'console').
   */
  const existingTenant = adapter.findTenantByUserEmail
    ? await adapter.findTenantByUserEmail(config, adminUser.email)
    : null;

  if (existingTenant) {
    tenantId = existingTenant.id || existingTenant.ten_id;
    console.log('logs.existingTenantFound', tenantId);
  } else if (adapter.createTenant) {
    tenantId = await adapter.createTenant(config, {
      subdomain:  subdomain || 'console',
      user_email: adminUser.email,
    });
    console.log('logs.newTenantCreated', tenantId);
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  /**
   * Return all three IDs so the caller can use them immediately
   * (e.g. to store in a session, redirect the user, or continue setup).
   */
  return { authUserId, project_id, tenantId };
}