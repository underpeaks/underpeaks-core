// app/api/create-storage-buckets/route.ts

/**
 * POST /api/create-storage-buckets
 *
 * Next.js App Router API route that sets up the required storage buckets for
 * a newly installed NXT_Flutter project.
 *
 * This route is called by the installer wizard during the "Setting up storage"
 * step. It resolves the correct database adapter for the project's DB type and
 * delegates the bucket-creation work to that adapter's setupStorageBuckets()
 * method.
 *
 * What are "storage buckets"?
 * ────────────────────────────
 * Storage buckets are managed file-storage containers used to hold user
 * uploads, media assets, and other files that the app needs to persist.
 * For example, Supabase provides built-in storage with named buckets;
 * Firebase uses Firebase Storage. The exact implementation is handled
 * entirely by the adapter — this route stays database-agnostic.
 *
 * Not all database adapters support storage setup (e.g. plain PostgreSQL has
 * no built-in file storage concept). If the resolved adapter does not
 * implement setupStorageBuckets(), this route returns a 400 with a clear
 * message rather than crashing with a runtime "is not a function" error.
 *
 * Request body (JSON):
 * ────────────────────
 *   dbConfig      {object} — Database connection configuration. Must include:
 *                 - type {string} — The database type key used to resolve the
 *                                   correct adapter (e.g. 'supabase', 'firebase').
 *                 - ...credentials — All other fields required by that adapter.
 *                 Required.
 *
 * Responses:
 * ──────────
 *   200 { success: true,  buckets }         — Buckets created; `buckets` contains
 *                                             the adapter's creation result.
 *   400 { success: false, message }         — Config missing or adapter does not
 *                                             support storage setup.
 *   500 { success: false, message }         — Unexpected server error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTranslations }           from 'next-intl/server';
import { getAdapter }                from '@/app/db-adapter';

/**
 * POST
 *
 * Handles POST requests to /api/create-storage-buckets.
 * Validates the request, resolves the DB adapter, and delegates storage
 * bucket setup to adapter.setupStorageBuckets().
 *
 * @param req — The incoming Next.js API request containing the JSON body.
 * @returns A NextResponse JSON object indicating success or failure.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  /**
   * t — Server-side translation function scoped to the
   * 'createStorageBucketsRoute' namespace. getTranslations() is the
   * server-side equivalent of the client-side useTranslations() hook.
   */
  //const t = await getTranslations('createStorageBucketsRoute');

  try {
    /**
     * Parse the incoming request body and extract the database config.
     * All other fields in the body are ignored.
     */
    const { dbConfig } = await req.json();

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    /**
     * Both dbConfig and dbConfig.type are required:
     *   - dbConfig      : contains the credentials needed to connect.
     *   - dbConfig.type : used by getAdapter() to resolve the correct adapter
     *                     class for this database (e.g. 'supabase', 'firebase').
     * Throwing here lets the catch block handle the 500 response uniformly.
     */
    if (!dbConfig || !dbConfig.type) {
      throw new Error(('errors.missingConfig'));
    }

    // -----------------------------------------------------------------------
    // Resolve the database adapter
    // -----------------------------------------------------------------------

    /**
     * getAdapter() returns the correct DBAdapter implementation for the
     * given database type. The adapter encapsulates all DB-specific storage
     * logic so this route does not need to know how each provider works.
     */
    const adapter = getAdapter(dbConfig.type, dbConfig);

    // -----------------------------------------------------------------------
    // Capability check
    // -----------------------------------------------------------------------

    /**
     * Not all adapters implement setupStorageBuckets. For example, a plain
     * PostgreSQL adapter has no concept of managed file storage.
     * We check for the method before calling it and return a descriptive 400
     * rather than letting a "is not a function" TypeError propagate to the
     * catch block and become a misleading 500 error.
     */
    if (!adapter.setupStorageBuckets) {
      return NextResponse.json(
        {
          success: false,
          message: 'errors.adapterNotSupported',  type: dbConfig.type ,
        },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Create storage buckets
    // -----------------------------------------------------------------------

    /**
     * Delegate to the adapter's setupStorageBuckets() method.
     * The adapter handles all provider-specific bucket creation logic and
     * returns a result object describing the buckets that were created.
     */
    const buckets = await adapter.setupStorageBuckets();

    return NextResponse.json({ success: true, buckets });

  } catch (error: any) {
    /**
     * Catch-all for any unexpected errors thrown during request parsing,
     * adapter resolution, or bucket creation. Returns the error's own message
     * so the installer UI has actionable information about what went wrong.
     */
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}