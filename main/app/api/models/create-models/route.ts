// app/api/create-models/route.ts

/**
 * POST /api/create-models
 *
 * Next.js App Router API route that generates and inserts the initial data
 * models for a newly installed NXT_Flutter project.
 *
 * This route is called by the installer wizard during the "Creating data models"
 * step. It resolves the correct database adapter for the project's DB type and
 * delegates the model-creation work to that adapter's
 * createDataModelsFromUserEmail() method.
 *
 * What are "data models" here?
 * ─────────────────────────────
 * Data models are the base schema records (e.g. table definitions, collection
 * structures, or seed rows) that the NXT_Flutter system needs to exist in the
 * database before the app can function. The exact models created depend on the
 * selectedProjectType (e.g. 'ecommerce', 'cms', 'saas') and are scoped to the
 * admin user's email so they can be associated with the correct account.
 *
 * Request body (JSON):
 * ────────────────────
 *   config              {object} — Database connection config (type + credentials).
 *                       Required. Used to resolve and initialise the DB adapter.
 *
 *   adminUser           {object} — Must contain at least:
 *                       - email {string} — Used to scope the created models to
 *                                          the correct admin account.
 *                       Required.
 *
 *   selectedProjectType {string} — The type of project being installed
 *                       (e.g. 'ecommerce', 'cms'). Determines which data models
 *                       are generated.
 *
 * Responses:
 * ──────────
 *   200 { success: true,  skipped, message, data }  — Models created or skipped.
 *   400 { success: false, message }                 — Validation failed or adapter
 *                                                     does not support this operation.
 *   500 { success: false, message }                 — Unexpected server error.
 *
 * The `skipped` field:
 * ─────────────────────
 * The adapter may return skipped: true if the models already exist for this
 * user (e.g. on a re-run of the installer). This is not an error — the route
 * returns 200 with skipped: true so the installer UI can handle it gracefully.
 */

import { NextResponse }    from 'next/server';
import { getTranslations } from 'next-intl/server';
import { getAdapter }      from '@/app/db-adapter';
import { DBAdapter }       from '@/app/db-adapter/types';

/**
 * POST
 *
 * Handles POST requests to /api/create-models.
 * Validates required fields, resolves the correct DB adapter, and delegates
 * data model creation to adapter.createDataModelsFromUserEmail().
 *
 * @param request — The incoming Next.js API request containing the JSON body.
 * @returns A NextResponse JSON object indicating success, skip, or failure.
 */
export async function POST(request: Request): Promise<NextResponse> {
  /**
   * t — Server-side translation function scoped to the 'createModelsRoute'
   * namespace. getTranslations() is the server-side equivalent of the
   * client-side useTranslations() hook.
   */
  

  try {
   // const t = await getTranslations('createModelsRoute');
    /**
     * Parse the incoming request body.
     * Destructure only the fields this route requires.
     */
    const { config, adminUser, selectedProjectType } = await request.json();

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * Both config and adminUser.email are required:
     *   - config      : needed to resolve and connect the correct DB adapter.
     *   - adminUser.email : used to scope the generated models to the right account.
     */
    if (!config || !adminUser?.email) {
      return NextResponse.json(
        { success: false, message: ('errors.missingConfigOrEmail') },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Resolve the database adapter
    // -----------------------------------------------------------------------

    /**
     * getAdapter() returns the correct DBAdapter implementation for the
     * given database type (e.g. SupabaseAdapter, FirebaseAdapter).
     * The adapter encapsulates all DB-specific logic so this route stays
     * database-agnostic.
     */
    const adapter: DBAdapter = getAdapter(config.type, config);

    /**
     * Not all adapters implement createDataModelsFromUserEmail — for example,
     * a read-only or minimal adapter may not support this operation.
     * We check for the method's existence before calling it and return a
     * clear 400 rather than a confusing "is not a function" runtime error.
     */
    if (!adapter.createDataModelsFromUserEmail) {
      return NextResponse.json(
        { success: false, message: ('errors.adapterNotSupported') },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Create data models
    // -----------------------------------------------------------------------

    /**
     * Delegate to the adapter's createDataModelsFromUserEmail() method.
     * This method:
     *   - Generates the appropriate data model records for the selectedProjectType.
     *   - Scopes them to the admin user identified by adminUser.email.
     *   - Returns { skipped, message, data } describing the outcome.
     *
     * If the models already exist, the adapter returns skipped: true instead
     * of throwing — this is an expected and handled case, not an error.
     */
    const result = await adapter.createDataModelsFromUserEmail(
      adminUser.email,
      selectedProjectType,
    );

    return NextResponse.json(
      {
        success: true,
        skipped: result.skipped || false,
        message: result.message,
        data:    result.data || null,
      },
      { status: 200 },
    );

  } catch (error: any) {
    /**
     * Catch-all for any unexpected errors thrown during request parsing,
     * adapter resolution, or model creation. Returns the error's own message
     * when available, or a generic fallback so the installer UI always has
     * something meaningful to display.
     */
    console.error('logs.createModelsError'), error;
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'errors.genericFailure',
      },
      { status: 500 },
    );
  }
}