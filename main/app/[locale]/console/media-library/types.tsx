/**
 * @file types.ts
 * @description
 * Shared TypeScript type definitions for the Media Library feature.
 * These types are imported by every component in the media module
 * (MediaPage, GridView, ListView, DetailPanel, etc.) to ensure all
 * components agree on the shape of the data they pass around.
 *
 * ─── Why centralise types here? ───────────────────────────────────────────────
 * Keeping types in one file means:
 *   - If the API response shape changes, you only update one place.
 *   - Every component that imports from this file automatically gets
 *     the updated type, and TypeScript will highlight anywhere that
 *     needs to be updated to match.
 */

// ─── MediaItem ────────────────────────────────────────────────────────────────

/**
 * @typedef MediaItem
 * Represents a single file stored in the Media Library.
 * This is the core data shape used across all media components.
 *
 * @property {string}  id          - A unique identifier for this file.
 *                                   Currently set to the file's public URL,
 *                                   but treat it as an opaque id.
 * @property {string}  name        - The file's filename including extension
 *                                   (e.g. "hero-image.jpg").
 * @property {string}  url         - The full public URL to access or preview
 *                                   this file (e.g. "https://cdn.example.com/...").
 * @property {string}  size        - Human-readable file size string
 *                                   (e.g. "240 KB", "1.2 MB").
 * @property {string}  mimeType    - The MIME type of the file
 *                                   (e.g. "image/png", "video/mp4", "application/pdf").
 *                                   Used to decide which preview or icon to render.
 * @property {string}  folder      - The id of the folder this file lives in
 *                                   (matches Folder.id, which is the raw folder name).
 * @property {string}  folderPath  - The relative path including folder and filename
 *                                   (e.g. "uploads/hero-image.jpg"). Used for display
 *                                   in the detail panel and list view.
 * @property {string}  uploaded    - A formatted date string showing when the file
 *                                   was uploaded (e.g. "12 May 2026").
 * @property {string}  [project_id]- Optional. The id of the project this file belongs
 *                                   to. Added later; marked optional so all existing
 *                                   code that creates MediaItems without it still works.
 * @property {string}  [dimensions]- Optional. Image pixel dimensions as a string
 *                                   (e.g. "1920 × 1080"). Only present for image files;
 *                                   undefined for videos, PDFs, and other types.
 */
export type MediaItem = {
  id:          string
  name:        string
  url:         string
  size:        string
  mimeType:    string
  folder:      string
  folderPath:  string
  uploaded:    string
  project_id?: string
  dimensions?: string
}

// ─── ImageItem ────────────────────────────────────────────────────────────────

/**
 * @typedef ImageItem
 * A backwards-compatibility alias for MediaItem.
 *
 * This type existed before the library was expanded to support videos,
 * documents, and other file types — at that point every file was called
 * an "image". Code that still references ImageItem will continue to work
 * without any changes because it resolves to exactly the same type.
 *
 * New code should use MediaItem directly.
 */
export type ImageItem = MediaItem

// ─── Folder ───────────────────────────────────────────────────────────────────

/**
 * @typedef Folder
 * Represents a storage folder that groups MediaItems together.
 *
 * @property {string} id    - The raw folder name used as a key in API calls
 *                            (e.g. "my-photos"). Lowercased, hyphen-separated.
 *                            This is what gets sent to endpoints like
 *                            /api/storage/list-files?folder=my-photos.
 * @property {string} name  - The human-readable display name shown in the UI
 *                            (e.g. "My Photos"). Derived by capitalising the id.
 * @property {number} count - The number of files currently inside this folder.
 *                            Shown as a badge in the sidebar and grid view.
 *                            Kept in sync locally after uploads, moves, and deletes
 *                            so the UI reflects changes without a full refetch.
 */
export type Folder = {
  id:    string
  name:  string
  count: number
}