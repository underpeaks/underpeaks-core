import 'server-only'

/**
 * API Route: POST /api/storage/upload-file
 *
 * A server-side endpoint that handles file uploads for two distinct use cases,
 * controlled by the `mode` field in the request form data:
 *
 *  1. "storage" mode — used by the media/file manager page.
 *     - Uploads the file to cloud storage (Firebase or Supabase) OR saves it
 *       to the local public/uploads folder (MongoDB / MySQL / Postgres).
 *     - Saves a metadata record to the nxf_storage table so the file appears
 *       in the media library.
 *
 *  2. "local" mode — used by the branding/settings pages.
 *     - Always saves the file directly to the public folder on disk.
 *     - Does NOT save any metadata record — this is intentional, as branding
 *       assets (logos, favicons) are referenced by path only.
 *
 * In both modes, the route also:
 * - Converts all uploaded images to PNG format using sharp for consistency.
 * - Optionally resizes images if a `resize` JSON value is provided.
 * - Builds a safe filename by stripping special characters.
 * - Attempts to resolve the project_id from the auth token so the metadata
 *   record can be linked to the correct project.
 *
 * Authentication: Optional (Bearer token used to resolve project_id if present)
 * Method:         POST
 * Body:           multipart/form-data with fields:
 *                   file    (File,   required) — the file to upload
 *                   folder  (string, required) — destination folder name
 *                   mode    (string, required) — 'storage' | 'local'
 *                   resize  (string, optional) — JSON: { width, height, fit }
 * Success:        { success: true, url, name, size, folder, mimeType }
 * Errors:         { error: string } with appropriate HTTP status codes
 *
 * NOTE: This file is marked 'server-only' which means Next.js will throw
 * a build error if it is ever accidentally imported by a client component.
 * This ensures file system access and storage credentials are never exposed
 * to the browser.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTranslations }           from 'next-intl/server'
import fs                            from 'fs'
import path                          from 'path'
import sharp                         from 'sharp'
import { getStorageAdapter }         from '@/app/lib/getStorageAdapter'
import { v4 as uuidv4 }              from 'uuid'

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

/**
 * POST
 *
 * Handles file uploads in either 'storage' or 'local' mode.
 * See the file-level JSDoc above for the full description of both modes.
 *
 * @param req - The incoming Next.js server request. Must be multipart/form-data
 *              containing at minimum a `file`, `folder`, and `mode` field.
 * @returns A NextResponse with upload result metadata on success,
 *          or { error: string } on failure.
 */
export async function POST(req: NextRequest) {
  /**
   * t — Server-side translation function scoped to the 'uploadFile' namespace.
   * Because this is a server-only route we use getTranslations() (async)
   * rather than the client-side useTranslations() hook.
   */
  //const t = await getTranslations('uploadFile')

  try {
    // ── Parse form data ──────────────────────────────────────────────────────

    /**
     * Parse the incoming multipart/form-data request.
     * We extract four fields:
     *
     * - file:      The actual file the user is uploading.
     * - folder:    The destination folder name (e.g. 'avatars', 'logos').
     * - resizeRaw: An optional JSON string with resize dimensions.
     *              Example: '{"width":800,"height":600,"fit":"inside"}'
     * - mode:      Controls which upload path is taken.
     *              'storage' = media library, 'local' = branding/public folder.
     */
    const formData  = await req.formData()
    const file      = formData.get('file')   as File   | null
    const folder    = formData.get('folder') as string | null
    const resizeRaw = formData.get('resize') as string | null
    const mode      = formData.get('mode')   as 'local' | 'storage' | null

    console.log(('logs.uploadMode'), mode)

    /**
     * Both file and folder are mandatory — without them we cannot determine
     * what to upload or where to put it. Return 400 immediately if either
     * is missing.
     */
    if (!file || !folder)
      return NextResponse.json(
        { error: ('errors.fileAndFolderRequired') },
        { status: 400 }
      )

    // ── Resolve project_id from auth token ───────────────────────────────────

    /**
     * We attempt to identify which project this upload belongs to by reading
     * the Bearer token from the Authorization header and looking up the
     * associated project in the database.
     *
     * This is wrapped in its own try/catch so that a failure here (e.g. no
     * token, expired token, project not found) does NOT abort the upload —
     * the file will still be saved, just without a project_id link on the
     * metadata record.
     *
     * project_id starts as null and is only set if the full lookup succeeds.
     */
    let project_id: string | null = null

    try {
      const authHeader = req.headers.get('Authorization')
      const token      = authHeader?.replace('Bearer ', '') ?? null

      if (token) {
        const adapter = getStorageAdapter()

        /**
         * Validate the token and decode its payload.
         * On success, decoded contains the user's unique ID.
         * On failure (expired, tampered), decoded will be null/undefined.
         */
        const decoded = await adapter.validateBuiltInSession?.(adapter.config, token)

        /**
         * Extract the user ID from the decoded token.
         * We check both uid and user_id because different adapters use
         * different field names for the same concept.
         */
        const uid = decoded?.uid ?? decoded?.user_id ?? null

        if (uid) {
          /**
           * Look up the project that belongs to this user so we can link
           * the uploaded file's metadata record to the correct project.
           */
          const project  = await adapter.findProjectByOwnerId?.(adapter.config, uid)
          project_id     = project?.id ?? project?.project_id ?? null
        }
      }
    } catch {
      /**
       * Log a warning if the project_id lookup fails, but do not abort.
       * The upload will continue and the metadata record will have a null
       * project_id instead.
       */
      console.warn(('logs.projectIdLookupFailed'))
    }

    // ── Read and process file ────────────────────────────────────────────────

    /**
     * Convert the uploaded File object to a Node.js Buffer so we can pass
     * it to sharp (for image processing) and to the filesystem/storage adapter.
     */
    const buffer  = Buffer.from(await file.arrayBuffer())
    const isImage = file.type.startsWith('image/')

    /**
     * Parse the optional resize parameter.
     * If provided it should be a JSON string like:
     *   '{"width": 800, "height": 600, "fit": "inside"}'
     * If not provided, resize will be null and no resizing is applied.
     */
    const resize  = resizeRaw ? JSON.parse(resizeRaw) : null

    /**
     * processed — the final buffer that will be written to disk or uploaded
     * to cloud storage. It starts as the raw upload buffer and may be
     * replaced by a sharp-processed version below.
     */
    let processed: Buffer = buffer

    if (isImage && resize) {
      /**
       * Image with resize instructions — resize to the requested dimensions
       * and convert to PNG. `withoutEnlargement: true` ensures we never make
       * a small image bigger, only smaller.
       */
      processed = await sharp(buffer)
        .resize({
          width:              resize.width,
          height:             resize.height,
          fit:                resize.fit ?? 'inside',
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9 })
        .toBuffer()
    } else if (isImage) {
      /**
       * Image without resize — just convert to PNG for consistency.
       * All uploaded images are normalised to PNG regardless of their
       * original format (JPEG, WEBP, GIF, etc.).
       */
      processed = await sharp(buffer)
        .png({ compressionLevel: 9 })
        .toBuffer()
    }

    // ── Build safe filename ──────────────────────────────────────────────────

    /**
     * Derive the file extension:
     * - For images, always use 'png' since we converted them above.
     * - For non-images, keep the original extension (e.g. 'pdf', 'mp4').
     */
    const ext = isImage
      ? 'png'
      : (path.extname(file.name) || '').replace('.', '')

    /**
     * Sanitise the base filename by:
     * 1. Stripping the extension.
     * 2. Replacing any characters that are not letters, numbers, underscores,
     *    or hyphens with an underscore — prevents path traversal or filesystem
     *    issues caused by spaces, dots, or special characters.
     * 3. Converting to lowercase for consistency.
     */
    const baseName = path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-z0-9_-]/gi, '_')
      .toLowerCase()

    /** The final safe filename, e.g. 'my_profile_photo.png' */
    const filename = ext ? `${baseName}.${ext}` : baseName

    /** MIME type for the processed file — always image/png for images. */
    const mimeType = isImage ? 'image/png' : file.type

    /**
     * Build a human-readable file size label for the response.
     * Shows MB for files over 1 MB, KB otherwise.
     */
    const sizeLabel = processed.length > 1024 * 1024
      ? `${(processed.length / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(processed.length / 1024)} KB`

    // ── Helper: save metadata to nxf_storage ────────────────────────────────

    /**
     * saveMetadata
     *
     * Saves a metadata record for the uploaded file to the nxf_storage
     * table/collection so it appears in the media library.
     *
     * This is defined as an inner async function so it has access to the
     * variables already computed above (folder, filename, mimeType, etc.)
     * without needing to pass them all as arguments every time.
     *
     * Wrapped in its own try/catch so that a metadata save failure does NOT
     * roll back or fail the upload — the file is already saved at this point.
     *
     * @param url      - The public URL or path where the file can be accessed.
     * @param filePath - The full file path stored for internal reference.
     */
    const saveMetadata = async (url: string, filePath: string) => {
      try {
        const adapter = getStorageAdapter()
        if (!adapter.create) return

        await adapter.create(adapter.config, 'nxf_storage', {
          storage_id: uuidv4(),
          project_id: project_id ?? null,
          folder,
          file_name:  filename,
          file_path:  filePath,
          url,
          mime_type:  mimeType,
          size:       processed.length,
          created_at: new Date().toISOString(),
        })

        console.log(('logs.metadataSaved'))
      } catch {
        /**
         * Log a warning without including the raw error — error messages from
         * database adapters can expose table names, query details, or connection
         * strings that should not appear in logs.
         */
        console.warn(('logs.metadataSaveFailed'))
      }
    }

    // ── Storage mode (media library) ─────────────────────────────────────────

    /**
     * In 'storage' mode the file is saved to the media library.
     * The specific storage mechanism depends on the configured database type:
     *
     * - Firebase / Supabase → upload to cloud storage bucket + save metadata.
     * - MongoDB / MySQL / Postgres → save to local public/uploads + save metadata.
     */
    if (mode === 'storage') {
      const dbType = process.env.NEXT_PUBLIC_DB_TYPE

      // ── Cloud storage (Firebase / Supabase) ──────────────────────────────

      if (dbType === 'firebase' || dbType === 'supabase') {
        const adapter = getStorageAdapter()

        /**
         * Ensure the adapter supports cloud uploads before attempting one.
         * Return 400 rather than letting the code crash with a "not a function"
         * error if uploadFile is missing.
         */
        if (!adapter.uploadFile)
          return NextResponse.json(
            { error: ('errors.uploadFileNotSupported') },
            { status: 400 }
          )

        /**
         * Upload the processed file buffer to the cloud storage bucket.
         * The adapter returns the public URL where the file can be accessed.
         */
        const url      = await adapter.uploadFile(folder, filename, processed, mimeType)
        const filePath = `${folder}/${filename}`

        await saveMetadata(url, filePath)

        return NextResponse.json({
          success:  true,
          url,
          name:     filename,
          size:     sizeLabel,
          folder,
          mimeType,
        })
      }

      // ── Local storage (MongoDB / MySQL / Postgres) ────────────────────────

      /**
       * For non-cloud database backends, save the file to the local filesystem
       * under public/uploads/<folder>/ so Next.js can serve it as a static asset.
       *
       * We create the directory if it doesn't exist yet (recursive: true
       * ensures parent directories are also created if needed).
       */
      const dirPath  = path.resolve(process.cwd(), 'public', 'uploads', folder)
      const filePath = path.join(dirPath, filename)

      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
      fs.writeFileSync(filePath, processed)

      /** The public URL path — served by Next.js static file handling. */
      const url = `/uploads/${folder}/${filename}`

      await saveMetadata(url, `/uploads/${folder}/${filename}`)

      return NextResponse.json({
        success:  true,
        url,
        name:     filename,
        size:     sizeLabel,
        folder,
        mimeType,
      })
    }

    // ── Local mode (branding / settings) ────────────────────────────────────

    /**
     * In 'local' mode the file is written directly to the public folder on disk.
     * This is used for branding assets like logos and favicons that are
     * referenced by a fixed path in the system config.
     *
     * No metadata record is saved — branding assets are tracked by path only
     * and do not need to appear in the media library.
     */
    const dirPath  = path.resolve(process.cwd(), 'public', folder)
    const filePath = path.join(dirPath, filename)

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, processed)

    const url = `/${folder}/${filename}`
    console.log(('logs.localUploadSuccess'), url)

    return NextResponse.json({
      success:  true,
      url,
      name:     filename,
      size:     sizeLabel,
      folder,
      mimeType,
    })

  } catch {
    /**
     * Catch-all for any unexpected errors (sharp processing failure, disk full,
     * cloud storage timeout, JSON parse error, etc.).
     *
     * We return a generic 500 without echoing back the raw error object or its
     * message — leaking internal paths, storage credentials, or stack traces
     * is a security risk.
     */
    return NextResponse.json(
      { error: ('errors.internalError') },
      { status: 500 }
    )
  }
}