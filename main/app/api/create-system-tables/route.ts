// app/api/create-system-tables/route.ts

/**
 * POST /api/create-system-tables
 *
 * Next.js App Router API route that creates all required database tables for
 * a newly installed NXT_Flutter project.
 *
 * This route is called by the installer wizard during the "Creating database
 * schema and tables" step. It runs a fixed sequence of table-creation
 * utilities against the project's database, ensuring the schema is fully
 * prepared before the admin user and data models are created in later steps.
 *
 * Table creation sequence:
 * ─────────────────────────
 * 1. Core system tables   (createSystemTables)
 *    The foundational tables required by the NXT_Flutter platform itself —
 *    e.g. configuration, audit logs, platform metadata. These are always
 *    created regardless of project type.
 *
 * 2. User tables          (createUsersTables)
 *    The tables that store user accounts, roles, sessions, and permissions.
 *    These are always created because every project needs authentication.
 *
 * 3. Project-specific tables (createProjectTables — currently disabled)
 *    Tables that vary by project type (e.g. 'ecommerce' adds products,
 *    orders, and cart tables). This step is scaffolded but commented out
 *    pending full implementation. See the inline note below for details.
 *
 * Request body (JSON):
 * ────────────────────
 *   config              {object} — Database connection configuration
 *                       (type + credentials). Required.
 *
 *   selectedProjectType {string} — The type of project being installed
 *                       (e.g. 'ecommerce', 'cms', 'blank'). Reserved for
 *                       the project-specific table step once it is enabled.
 *
 * Responses:
 * ──────────
 *   200 { success: true,  message } — All tables created successfully.
 *   400 { success: false, message } — DB config missing from request body.
 *   500 { success: false, message } — Unexpected error during table creation.
 */

import { NextResponse } from 'next/server';
import {
  createSystemTables,
  createUsersTables,
} from '../../db-adapter/utils/create-system-tables';

/*
 * NOTE — createProjectTables (disabled)
 *
 * The import below and its usage further down are intentionally commented out.
 * Project-specific table creation (step 3) is scaffolded here but not yet
 * fully implemented. When it is ready, uncomment both the import and the
 * step-3 block inside the POST handler, and remove this note.
 *
 * import { createProjectTables } from '@/app/db-adapter/utils/create-project-tables';
 */

/**
 * POST
 *
 * Handles POST requests to /api/create-system-tables.
 * Validates the config, then runs the table-creation sequence in order.
 *
 * @param request — The incoming Next.js API request containing the JSON body.
 * @returns A NextResponse JSON object indicating success or failure.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { config, selectedProjectType } = await request.json()

    // Temporary debug — remove after fix confirmed
    console.log('[create-system-tables] config.type:', config?.type)
    console.log('[create-system-tables] config.host:', config?.host)
    console.log('[create-system-tables] config.user:', config?.user)
    console.log('[create-system-tables] config.database:', config?.database)
    console.log('[create-system-tables] password length:', config?.password?.length)
    console.log('[create-system-tables] password value:', config?.password)
    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * The database config is required for every table-creation utility.
     * Without it none of the steps can connect to the database.
     */
    if (!config) {
      return NextResponse.json(
        { success: false, message: 'Database config is required' },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Step 1 — Core system tables
    // -----------------------------------------------------------------------

    /**
     * Creates the foundational NXT_Flutter platform tables.
     * These must exist before any other tables are created because later
     * steps (user tables, project tables) may reference them via foreign keys
     * or platform-level configuration records.
     */
    await createSystemTables(config);

    // -----------------------------------------------------------------------
    // Step 2 — User tables
    // -----------------------------------------------------------------------

    /**
     * Creates the tables required for user accounts, roles, sessions, and
     * permissions. Every project type needs these regardless of the chosen
     * stack or project template.
     */
    await createUsersTables(config);

    // -----------------------------------------------------------------------
    // Step 3 — Project-specific tables (pending implementation)
    // -----------------------------------------------------------------------

    /*
     * This step will create tables that are unique to the chosen project type.
     * For example, an 'ecommerce' project would get products, orders, and cart
     * tables here, while a 'blank' project would skip this step entirely.
     *
     * Uncomment the block below once createProjectTables is implemented:
     *
     * if (selectedProjectType !== 'blank') {
     *   await createProjectTables(config, selectedProjectType);
     * }
     */

    return NextResponse.json({
      success: true,
      message: 'System tables created successfully',
    });

  } catch (error: any) {
    /**
     * Catch-all for any unexpected errors thrown during request parsing or
     * any of the table-creation steps. The error message is logged server-side
     * for debugging and returned to the caller so the installer UI can display
     * a meaningful failure reason.
     */
    console.error('[create-system-tables] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}