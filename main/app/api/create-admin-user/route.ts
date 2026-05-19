// app/api/create-admin-user/route.ts

/**
 * POST /api/create-admin-user
 *
 * Next.js App Router API route that creates the initial administrator account
 * for a newly installed NXT_Flutter project.
 *
 * This route is called by the installer wizard during the "Creating admin user"
 * step. It acts as a thin validation layer between the installer UI and the
 * actual account-creation logic, which lives in createAdminUserFlow().
 *
 * Request body (JSON):
 * ────────────────────
 *   config      {object} — Database connection configuration (type + credentials).
 *               Required. Used by createAdminUserFlow to connect to the correct DB.
 *
 *   adminUser   {object} — The admin account details provided by the installer:
 *               - email    {string} — The admin's login email address.
 *               - fullName {string} — The admin's display name.
 *               - password {string} — Plain-text password; hashed inside
 *                                     createAdminUserFlow before storage.
 *               Required.
 *
 *   projectName {string} — The name of the project being installed.
 *               Used to scope the admin account to the correct project.
 *
 *   subdomain   {string} — The subdomain assigned to the project.
 *               Used alongside projectName to identify the installation.
 *
 * Responses:
 * ──────────
 *   201 (implicit 200) { success: true,  message: '...' } — Admin created.
 *   400              { success: false, message: '...' } — Validation failed.
 *   500              { success: false, message: '...' } — Unexpected error.
 *
 * Security note:
 * ──────────────
 * The raw password received here is never logged or stored in plain text.
 * It is passed directly to createAdminUserFlow(), which is responsible for
 * hashing it (e.g. with bcrypt) before writing it to the database.
 */

import { NextResponse }          from 'next/server';
import { getTranslations }       from 'next-intl/server';
import { createAdminUserFlow }   from '@/app/db-adapter/utils/create-admin-user-flow';

/**
 * POST
 *
 * Handles POST requests to /api/create-admin-user.
 * Validates the required fields and delegates to createAdminUserFlow().
 *
 * @param request — The incoming Next.js API request containing the JSON body.
 * @returns A NextResponse JSON object indicating success or failure.
 */
export async function POST(request: Request): Promise<NextResponse> {
  /**
   * t — Server-side translation function scoped to the 'createAdminUserRoute'
   * namespace. Used for all response messages so they are consistent with the
   * app's i18n system. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
  //const t = await getTranslations('createAdminUserRoute');

  try {
    /**
     * Parse the incoming request body.
     * Destructure only the fields we need — any extra fields are ignored.
     */
    const { config, adminUser, projectName, subdomain } = await request.json();

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * Ensure the database config is present. Without it, createAdminUserFlow
     * cannot connect to the database to create the account.
     */
    if (!config) {
      return NextResponse.json(
        { success: false, message: ('errors.missingConfig') },
        { status: 400 },
      );
    }

    /**
     * Ensure the admin user data is present. Without it, there is nothing
     * to create.
     */
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: ('errors.missingAdminUser') },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Create the admin user
    // -----------------------------------------------------------------------

    /**
     * Delegate to createAdminUserFlow() which handles:
     *   - Hashing the plain-text password before storage.
     *   - Inserting the admin record into the correct database.
     *   - Any project/subdomain scoping required by the DB adapter.
     *
     * If this throws, the catch block below returns a 500 response.
     */
    await createAdminUserFlow(config, adminUser, projectName, subdomain);

    return NextResponse.json({
      success: true,
      message: ('success.adminCreated'),
    });

  } catch (error: any) {
    /**
     * Catch-all for any unexpected errors thrown by request parsing or
     * createAdminUserFlow(). Returns the error's own message when available,
     * or a generic fallback so the installer UI always has something to show.
     */
    return NextResponse.json(
      {
        success: false,
        message: error.message || ('errors.genericFailure'),
      },
      { status: 500 },
    );
  }
}