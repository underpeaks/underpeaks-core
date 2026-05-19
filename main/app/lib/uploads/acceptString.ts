/**
 * getAcceptString.ts
 *
 * A pure utility function that converts a file type category into an HTML
 * `accept` attribute string for use on file input elements.
 *
 * ─── Why this exists ──────────────────────────────────────────────────────
 *
 * When a browser renders a file picker (via `<input type="file">`), the
 * `accept` attribute tells the browser which file types to allow the user
 * to select. The value must be a comma-separated string of MIME types or
 * file extensions in a specific format.
 *
 * Rather than writing these strings by hand in every component that needs
 * a file input, this function centralises the mapping so:
 *   - The strings are defined in one place and easy to update.
 *   - Components work with a simple category name ('image', 'video', etc.)
 *     instead of memorising MIME type syntax.
 *   - Adding support for a new category requires a change in only this file.
 *
 * ─── How to use it ────────────────────────────────────────────────────────
 *
 *   import { getAcceptString } from '@/utils/getAcceptString'
 *
 *   // In a React component:
 *   <input type="file" accept={getAcceptString('image')} />
 *   // Renders as: <input type="file" accept="image/*" />
 *
 *   <input type="file" accept={getAcceptString('document')} />
 *   // Renders as: <input type="file" accept=".pdf,.doc,.docx,..." />
 *
 * ─── Accepted categories ──────────────────────────────────────────────────
 *
 * | UploadFileType | Accept string produced                              |
 * |----------------|-----------------------------------------------------|
 * | 'image'        | image/*  (all image formats)                        |
 * | 'video'        | video/*  (all video formats)                        |
 * | 'document'     | .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx,       |
 * |                |  .txt, .csv  (common office and text formats)       |
 * | 'any'          |  (no restriction — all file types allowed)      |
 * | undefined      |  (fallback — same as 'any')                     |
 */

import { UploadFileType } from './types'

/**
 * getAcceptString
 *
 * Maps a file type category to its corresponding HTML `accept` attribute string.
 *
 * @param fileType - An optional UploadFileType category string.
 *                   When omitted or unrecognised, defaults to '*\/*' (all files).
 *
 * @returns A string suitable for use as the `accept` attribute on an
 *          `<input type="file">` element.
 */
export function getAcceptString(fileType?: UploadFileType): string {
  switch (fileType) {

    /**
     * 'image' — Accepts all image formats the browser supports.
     * The wildcard `image/*` covers JPEG, PNG, GIF, WebP, SVG, and more.
     * The browser filters the file picker to show only image files.
     */
    case 'image':
      return 'image/*'

    /**
     * 'video' — Accepts all video formats the browser supports.
     * The wildcard `video/*` covers MP4, WebM, MOV, AVI, and more.
     */
    case 'video':
      return 'video/*'

    /**
     * 'document' — Accepts common office and text document formats.
     * Uses explicit file extensions rather than MIME types because
     * MIME type support for office formats varies across browsers and
     * operating systems. Extensions are more reliably recognised.
     *
     * Supported formats:
     *   .pdf           — Portable Document Format
     *   .doc / .docx   — Microsoft Word documents
     *   .xls / .xlsx   — Microsoft Excel spreadsheets
     *   .ppt / .pptx   — Microsoft PowerPoint presentations
     *   .txt           — Plain text files
     *   .csv           — Comma-separated value files
     */
    case 'document':
      return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'

    /**
     * 'any' or undefined — No restriction on file type.
     * The wildcard `*\/*` instructs the browser to show all files
     * in the file picker without any filtering.
     *
     * This is also the default fallback for unrecognised or missing values,
     * ensuring the function never returns an invalid accept string.
     */
    case 'any':
    default:
      return '*/*'
  }
}