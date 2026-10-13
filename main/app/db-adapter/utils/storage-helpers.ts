// app/db-adapter/utils/storage-helpers.ts
//
// Shared, database-independent storage logic used by all five adapters.
// Nothing in here talks to a database. Adapters keep only their DB calls.
//
// Root folder rule: the media library calls the root "uploads". New root files
// are saved as folder = 'uploads', file_path = '<name>'. Older rows saved as
// 'uploads/<name>', '/<name>' or with an empty folder are still found.

import fs from 'fs'
import path from 'path'
import type { StorageFile } from '../types'

export const ROOT_FOLDER = 'uploads'

export const SIGNED_URL_SECONDS = 7 * 24 * 60 * 60

// ─── Folder and path rules ───────────────────────────────────────────────────

/** '' for the root ('uploads', '' or '/'), otherwise the folder without slashes. */
export function normalizeFolder(folder?: string | null): string {
  const f = (folder ?? '').replace(/^\/+|\/+$/g, '')
  return f === ROOT_FOLDER ? '' : f
}

/** The value saved in the `folder` column ('uploads' for the root). */
export function storedFolder(folder?: string | null): string {
  return normalizeFolder(folder) || ROOT_FOLDER
}

/** The value saved in `file_path`: '<folder>/<name>', or just '<name>' for the root. */
export function storedPath(folder: string | null | undefined, fileName: string): string {
  const f = normalizeFolder(folder)
  return f ? `${f}/${fileName}` : fileName
}

/** Every file_path a file could have been saved under (old and new layouts). */
export function pathVariants(folder: string | null | undefined, fileName: string): string[] {
  const f = normalizeFolder(folder)
  return f
    ? [`${f}/${fileName}`]
    : [fileName, `${ROOT_FOLDER}/${fileName}`, `/${fileName}`]
}

/** Every `folder` value that means the same folder. */
export function folderVariants(folder?: string | null): string[] {
  const f = normalizeFolder(folder)
  return f ? [f] : [ROOT_FOLDER, '']
}

/** Variants for deleteStorageRecordByFilePath('uploads/photo.png' or 'photo.png'). */
export function recordPathVariants(filePath: string): string[] {
  const p    = (filePath ?? '').replace(/^\/+/, '')
  const list = new Set<string>([filePath, p])

  if (p.startsWith(`${ROOT_FOLDER}/`)) {
    const rest = p.slice(ROOT_FOLDER.length + 1)
    if (rest && !rest.includes('/')) list.add(rest)
  } else if (p && !p.includes('/')) {
    list.add(`${ROOT_FOLDER}/${p}`)
  }

  return Array.from(list).filter(Boolean)
}

/** '?, ?, ?' for MySQL IN (...) lists. */
export function sqlPlaceholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ')
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export function formatSize(bytes: number | string | null | undefined): string {
  const b = Number(bytes ?? 0)
  return b > 1024 * 1024
    ? `${(b / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(b / 1024)} KB`
}

export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

/** 'YYYY-MM-DD HH:MM:SS' (UTC) for MySQL DATETIME columns. */
export function sqlDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

// ─── Local disk storage (Postgres, MySQL, MongoDB) ───────────────────────────
// Files live in <project>/public/uploads so Next.js serves them at /uploads/...

export function localUploadsRoot(): string {
  return path.resolve(process.cwd(), 'public', 'uploads')
}

export function localDir(folder?: string | null): string {
  const root = localUploadsRoot()
  const f    = normalizeFolder(folder)
  if (!f) return root

  const dir = path.resolve(root, f)
  if (dir !== root && !dir.startsWith(root + path.sep)) throw new Error('Invalid folder')
  return dir
}

export function localUrl(folder: string | null | undefined, fileName: string): string {
  const f = normalizeFolder(folder)
  return f ? `/uploads/${f}/${fileName}` : `/uploads/${fileName}`
}

export function ensureLocalFolder(folder: string): void {
  fs.mkdirSync(localDir(folder), { recursive: true })
}

export function writeLocalFile(folder: string, fileName: string, buffer: Buffer): void {
  const dir = localDir(folder)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, fileName), buffer)
}

export function deleteLocalFile(folder: string, fileName: string): void {
  const filePath = path.join(localDir(folder), fileName)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

export function deleteLocalFolder(folder: string): void {
  if (!normalizeFolder(folder)) throw new Error('The root uploads folder cannot be deleted')
  const dir = localDir(folder)
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true })
}

/** Renames on disk. Returns false when there is no local file (external-URL rows). */
export function renameLocalFile(folder: string, oldName: string, newName: string): boolean {
  const dir     = localDir(folder)
  const oldPath = path.join(dir, oldName)
  if (!fs.existsSync(oldPath)) return false
  fs.renameSync(oldPath, path.join(dir, newName))
  return true
}

/** Moves on disk. Returns false when there is no local file (external-URL rows). */
export function moveLocalFile(fromFolder: string, toFolder: string, fileName: string): boolean {
  const oldPath = path.join(localDir(fromFolder), fileName)
  if (!fs.existsSync(oldPath)) return false

  const newDir  = localDir(toFolder)
  const newPath = path.join(newDir, fileName)

  // Moving a file onto itself must never delete it.
  if (path.resolve(oldPath) === path.resolve(newPath)) return true

  fs.mkdirSync(newDir, { recursive: true })
  fs.renameSync(oldPath, newPath)
  return true
}

// ─── Import from URL ─────────────────────────────────────────────────────────

export interface RemoteFile {
  buffer:   Buffer
  mimeType: string
  fileName: string
}

export async function fetchRemoteFile(url: string): Promise<RemoteFile> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch URL: ${url}`)

  const buffer   = Buffer.from(await response.arrayBuffer())
  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream'
  const ext      = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'

  return { buffer, mimeType, fileName: `imported_${Date.now()}.${ext}` }
}

export function toImportedStorageFile(
  folder:    string,
  remote:    RemoteFile,
  uploadUrl: string
): StorageFile {
  return {
    id:         `${folder}/${remote.fileName}`,
    name:       remote.fileName,
    url:        uploadUrl,
    size:       `${Math.round(remote.buffer.length / 1024)} KB`,
    mimeType:   remote.mimeType,
    folder,
    folderPath: `${folder}/${remote.fileName}`,
    uploaded:   formatDate(new Date()),
  }
}