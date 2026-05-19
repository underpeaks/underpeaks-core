/**
 * types.ts — Upload System Type Definitions
 *
 * This file defines all shared TypeScript types used by the file upload
 * system. Any component, hook, or utility that handles file uploading
 * imports its types from here.
 *
 * ─── What is defined here ─────────────────────────────────────────────────
 *
 * UploadFileType
 *   A union type describing the category of file being uploaded.
 *   Used to filter the browser's file picker via the `accept` attribute.
 *
 * UploadConfig
 *   The configuration object passed to upload components and hooks.
 *   Controls where files are stored, what types are allowed, size limits,
 *   display labels, image resizing behaviour, and the storage mode.
 *
 * UploadResult
 *   The object returned after a file has been successfully uploaded.
 *   Contains everything the application needs to display, reference,
 *   or store a record of the uploaded file.
 */

// ---------------------------------------------------------------------------
// UploadFileType
// ---------------------------------------------------------------------------

/**
 * UploadFileType
 *
 * Represents the category of file the upload input should accept.
 * This is passed to `getAcceptString()` which converts it into the correct
 * HTML `accept` attribute value for the browser's file picker.
 *
 * | Value      | Files allowed                                            |
 * |------------|----------------------------------------------------------|
 * | 'image'    | All image formats (JPEG, PNG, WebP, GIF, SVG, etc.)      |
 * | 'video'    | All video formats (MP4, WebM, MOV, AVI, etc.)            |
 * | 'document' | Office and text files (.pdf, .doc, .xlsx, .csv, etc.)    |
 * | 'any'      | No restriction — the user can select any file type.      |
 */
export type UploadFileType = 'image' | 'video' | 'document' | 'any'

// ---------------------------------------------------------------------------
// UploadConfig
// ---------------------------------------------------------------------------

/**
 * UploadConfig
 *
 * The configuration object that controls the behaviour of an upload component
 * or hook. Pass this wherever a file upload needs to be set up.
 *
 * ─── Fields ───────────────────────────────────────────────────────────────
 *
 * folder
 *   The destination folder (or bucket path) where uploaded files will be
 *   stored. When omitted, the upload system uses its own default folder.
 *   Example: 'avatars', 'product-images', 'documents/invoices'.
 *
 * allowFolderSelect
 *   When true, the browser file picker will allow the user to select an
 *   entire folder rather than individual files. Defaults to false.
 *   Note: browser support for folder selection varies.
 *
 * fileType
 *   The category of files the input should accept. Controls both the
 *   browser's file picker filter and any server-side validation.
 *   See UploadFileType for the full list of options.
 *   When omitted, defaults to 'any' (no restriction).
 *
 * maxSizeKb
 *   The maximum allowed file size in kilobytes (KB). Files larger than
 *   this limit will be rejected before upload begins.
 *   Required — must always be explicitly set to prevent accidental
 *   acceptance of very large files.
 *   Example: 2048 = 2 MB limit.
 *
 * label
 *   The display label shown above or alongside the upload input.
 *   When omitted, the component renders without a label.
 *   Example: 'Profile Photo', 'Product Image'.
 *
 * hint
 *   A short helper text shown below the upload input to guide the user.
 *   When omitted, no hint is shown.
 *   Example: 'JPG or PNG, max 2 MB'.
 *
 * recommended
 *   A string describing the recommended file specification.
 *   Displayed as a secondary hint to help users upload the best quality file.
 *   When omitted, no recommendation is shown.
 *   Example: 'Recommended size: 1200 × 630px'.
 *
 * resize
 *   Optional image resizing instructions applied server-side after upload.
 *   Only relevant when uploading images. When omitted, no resizing occurs.
 *
 *   width  — Target width in pixels.
 *   height — Target height in pixels.
 *   fit    — How the image is resized to fit the target dimensions:
 *     - 'inside' → Scales the image down to fit within the box while
 *                  preserving its aspect ratio. The image will never be
 *                  larger than width × height. Ideal for thumbnails.
 *     - 'cover'  → Scales and crops the image to fill the box exactly.
 *                  Some parts of the image may be cropped. Ideal for
 *                  fixed-size profile photos or banners.
 *
 * mode
 *   Determines where the file is stored after upload:
 *   - 'local'   → The file is saved to the local server's file system.
 *                 Suitable for self-hosted deployments without cloud storage.
 *   - 'storage' → The file is uploaded to a cloud storage provider
 *                 (e.g. Supabase Storage). Suitable for production deployments.
 *   When omitted, the upload system uses its configured default mode.
 */
export interface UploadConfig {
  folder?:            string
  allowFolderSelect?: boolean
  fileType?:          UploadFileType
  maxSizeKb:          number
  label?:             string
  hint?:              string
  recommended?:       string
  resize?:            { width: number; height: number; fit: 'inside' | 'cover' }
  mode?:              'local' | 'storage'
}

// ---------------------------------------------------------------------------
// UploadResult
// ---------------------------------------------------------------------------

/**
 * UploadResult
 *
 * The object returned by the upload system after a file has been
 * successfully uploaded. Contains all the information the application
 * needs to display, link to, or store a reference to the uploaded file.
 *
 * ─── Fields ───────────────────────────────────────────────────────────────
 *
 * url
 *   The publicly accessible URL of the uploaded file.
 *   Use this to display the file in the UI or share it with others.
 *   Example: 'https://cdn.example.com/avatars/user-123.png'
 *
 * name
 *   The file's name as stored in the upload destination.
 *   May differ from the original file name if the system renamed it
 *   (e.g. to avoid collisions or enforce a naming convention).
 *   Example: 'user-123-avatar.png'
 *
 * size
 *   The size of the uploaded file in bytes.
 *   Example: 204800 (= 200 KB)
 *
 * folder
 *   The folder or bucket path where the file was stored.
 *   Matches the `folder` field from the UploadConfig used for the upload.
 *   Example: 'avatars'
 *
 * mimeType
 *   The MIME type of the uploaded file as detected or reported by the browser.
 *   Example: 'image/png', 'application/pdf', 'video/mp4'
 */
export interface UploadResult {
  url:      string
  name:     string
  size:     number
  folder:   string
  mimeType: string
}