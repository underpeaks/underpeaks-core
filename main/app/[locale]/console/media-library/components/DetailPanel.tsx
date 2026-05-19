'use client'

/**
 * @file DetailPanel.tsx
 * @description
 * A side panel that appears when the user selects a file in the Media Library.
 * It shows a preview of the file, its metadata, and provides actions:
 * copying the URL, renaming, moving to another folder, and deleting.
 *
 * ─── Sections inside this panel ──────────────────────────────────────────────
 *
 * 1. HEADER       — Shows the file name and a close button.
 * 2. PREVIEW      — Renders the file as an image, video, or generic file icon.
 * 3. URL COPY     — Displays the public URL with a one-click copy button.
 * 4. METADATA     — Shows folder, path, size, type, upload date, and dimensions.
 * 5. RENAME       — Inline rename form that calls the rename API on save.
 * 6. MOVE         — Dropdown to move the file to a different folder via the move API.
 * 7. DELETE       — Red button that triggers the parent's delete handler.
 *
 * ─── How async actions work ───────────────────────────────────────────────────
 * Rename and Move both follow the same pattern:
 *   - A "busy" flag disables the buttons while the API call is in flight.
 *   - If the API returns an error, the message is shown inline in red.
 *   - On success, the parent component is notified via a callback prop.
 */

import { useState } from 'react'
import {
  FiX, FiCheck, FiLink, FiTrash2, FiFile,
  FiFileText, FiEdit2, FiFolderPlus,
} from 'react-icons/fi'
import { useTranslations } from 'next-intl'
import { MediaItem, Folder } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * @interface DetailPanelProps
 * Defines all the data and callbacks this component needs from its parent.
 *
 * @prop {MediaItem} image      - The file currently selected in the media library.
 * @prop {Folder[]}  folders    - Full list of folders (used to look up names and
 *                                populate the "Move to Folder" dropdown).
 * @prop {Function}  onClose    - Called when the user clicks the ✕ close button.
 * @prop {Function}  onDelete   - Called with the MediaItem when the user clicks
 *                                "Delete File". The parent handles confirmation.
 * @prop {Function}  onRename   - Called with the MediaItem and the new name string
 *                                after a successful rename API call.
 * @prop {Function}  onMove     - Called with the MediaItem and the destination
 *                                folder id after a successful move API call.
 */
interface DetailPanelProps {
  image:    MediaItem
  folders:  Folder[]
  onClose:  () => void
  onDelete: (item: MediaItem) => void
  onRename: (item: MediaItem, newName: string) => void
  onMove:   (item: MediaItem, toFolder: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component DetailPanel
 * @description
 * Renders the right-hand detail panel for a selected media file.
 * All user-facing strings are loaded from the "detailPanel" translation namespace.
 *
 * @param {DetailPanelProps} props - See interface above.
 * @returns {JSX.Element}
 */
export default function DetailPanel({
  image, folders, onClose, onDelete, onRename, onMove,
}: DetailPanelProps) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "detailPanel" namespace in en.json.
   */
  const t = useTranslations('detailPanel')

  // ─── URL Copy State ──────────────────────────────────────────────────────────

  /**
   * `copied` — true for 2 seconds after the user copies the URL.
   * Used to swap the copy icon for a green checkmark as visual feedback.
   */
  const [copied, setCopied] = useState(false)

  // ─── Rename State ────────────────────────────────────────────────────────────

  /**
   * `renaming`    — whether the rename input form is currently visible.
   * `newName`     — the current value of the rename text input.
   * `renameBusy`  — true while the rename API request is in flight (disables buttons).
   * `renameError` — holds the error message string if the API call fails, else null.
   */
  const [renaming,    setRenaming]    = useState(false)
  const [newName,     setNewName]     = useState(image.name)
  const [renameBusy,  setRenameBusy]  = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  // ─── Move State ──────────────────────────────────────────────────────────────

  /**
   * `moving`     — whether the move folder dropdown is currently visible.
   * `moveFolder` — the folder id currently selected in the dropdown.
   * `moveBusy`   — true while the move API request is in flight (disables buttons).
   * `moveError`  — holds the error message string if the API call fails, else null.
   */
  const [moving,     setMoving]     = useState(false)
  const [moveFolder, setMoveFolder] = useState(image.folder)
  const [moveBusy,   setMoveBusy]   = useState(false)
  const [moveError,  setMoveError]  = useState<string | null>(null)

  // ─── Derived Values ──────────────────────────────────────────────────────────

  /**
   * Look up the full Folder object for the file's current folder id.
   * Used to display the human-readable folder name instead of the raw id.
   */
  const folder = folders.find((f) => f.id === image.folder)

  /**
   * Detect the file type so we know which preview element to render.
   * We check the MIME type string (e.g. "image/png", "video/mp4").
   */
  const isImage = image.mimeType?.startsWith('image/')
  const isVideo = image.mimeType?.startsWith('video/')

  /**
   * All folders except the one the file is already in.
   * These are the valid destinations shown in the "Move to Folder" dropdown.
   */
  const otherFolders = folders.filter((f) => f.id !== image.folder)

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /**
   * @function copy
   * Copies the file's public URL to the user's clipboard.
   * Sets `copied` to true for 2 seconds to show a visual confirmation checkmark.
   */
  const copy = () => {
    navigator.clipboard.writeText(image.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /**
   * @function handleRename
   * Validates the new name, then calls the rename API endpoint.
   *
   * Steps:
   *   1. Trim whitespace from the input value.
   *   2. If it is empty or unchanged, just close the rename form — no API call needed.
   *   3. Set `renameBusy` true to disable the Save/Cancel buttons during the request.
   *   4. POST to `/api/storage/rename-file` with the folder, old name, and new name.
   *   5. On success: notify the parent via `onRename` and close the form.
   *   6. On failure: show the error message inline beneath the input.
   *   7. Always reset `renameBusy` to false when done (success or failure).
   */
  const handleRename = async () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === image.name) { setRenaming(false); return }

    setRenameBusy(true)
    setRenameError(null)

    try {
      const res = await fetch('/api/storage/rename-file', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          folder:  image.folder,
          oldName: image.name,
          newName: trimmed,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('errors.renameFailed'))
      onRename(image, trimmed)
      setRenaming(false)
    } catch (err: any) {
      setRenameError(err.message)
    } finally {
      setRenameBusy(false)
    }
  }

  /**
   * @function handleMove
   * Validates the selected destination, then calls the move API endpoint.
   *
   * Steps:
   *   1. If the selected folder is the same as the current one, just close — no API call.
   *   2. Set `moveBusy` true to disable buttons during the request.
   *   3. POST to `/api/storage/move-file` with fromFolder, toFolder, and fileName.
   *   4. On success: notify the parent via `onMove` and close the move form.
   *   5. On failure: show the error message inline beneath the dropdown.
   *   6. Always reset `moveBusy` to false when done.
   */
  const handleMove = async () => {
    if (moveFolder === image.folder) { setMoving(false); return }

    setMoveBusy(true)
    setMoveError(null)

    try {
      const res = await fetch('/api/storage/move-file', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fromFolder: image.folder,
          toFolder:   moveFolder,
          fileName:   image.name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('errors.moveFailed'))
      onMove(image, moveFolder)
      setMoving(false)
    } catch (err: any) {
      setMoveError(err.message)
    } finally {
      setMoveBusy(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-64 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">

      {/* ── Header ── Shows the file name and a close (✕) button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700 truncate">{image.name}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
          <FiX size={16} />
        </button>
      </div>

      {/* ── Preview ──
          Renders different elements depending on the file type:
          - image/* → <img> tag with cover fit
          - video/* → <video> tag with native controls
          - anything else → a placeholder box with a file icon and the MIME type label */}
      <div className="p-4 border-b border-gray-100">
        {isImage ? (
          <img
            src={image.url}
            alt={image.name}
            className="w-full aspect-square object-cover rounded-md border border-gray-200"
          />
        ) : isVideo ? (
          <video
            src={image.url}
            controls
            className="w-full rounded-md border border-gray-200"
          />
        ) : (
          <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-md border border-gray-200">
            {image.mimeType?.includes('pdf')
              ? <FiFileText size={32} className="text-gray-300" />
              : <FiFile     size={32} className="text-gray-300" />
            }
            <p className="text-xs text-gray-400">{image.mimeType}</p>
          </div>
        )}
      </div>

      {/* ── URL Copy ──
          Shows the file's public URL in a monospace font.
          Clicking the link icon copies it to the clipboard.
          The icon swaps to a green checkmark for 2 seconds as confirmation. */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
          {t('sections.fileUrl')}
        </p>
        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600 truncate flex-1 font-mono">{image.url}</p>
          <button onClick={copy} className="shrink-0 text-gray-400 hover:text-gray-700">
            {copied
              ? <FiCheck size={13} className="text-green-500" />
              : <FiLink  size={13} />
            }
          </button>
        </div>
      </div>

      {/* ── Metadata ──
          Renders a list of key/value rows for the file's details.
          The `dimensions` row is only included when the value is present
          (images have dimensions; documents and videos typically do not). */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">
          {t('sections.metadata')}
        </p>
        <div className="flex flex-col gap-2.5">
          {[
            { label: t('metadata.folder'),     value: folder?.name ?? image.folder ?? '—' },
            { label: t('metadata.path'),       value: image.folderPath                     },
            { label: t('metadata.size'),       value: image.size                           },
            { label: t('metadata.type'),       value: image.mimeType                       },
            { label: t('metadata.uploaded'),   value: image.uploaded                       },
            ...(image.dimensions
              ? [{ label: t('metadata.dimensions'), value: image.dimensions }]
              : []),
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-start gap-3">
              <span className="text-xs text-gray-400 shrink-0">{row.label}</span>
              <span className="text-xs text-gray-700 font-medium text-right break-all">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Rename ──
          Shows the current file name in monospace by default.
          Clicking the pencil icon reveals an inline input field.
          - Pressing Enter or clicking Save triggers handleRename().
          - Any API error is shown in red beneath the input.
          - Cancel resets the form back to the read-only name display. */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">
            {t('sections.rename')}
          </p>
          {!renaming && (
            <button
              onClick={() => { setRenaming(true); setNewName(image.name) }}
              className="text-gray-400 hover:text-gray-700"
            >
              <FiEdit2 size={12} />
            </button>
          )}
        </div>

        {renaming ? (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              autoFocus
            />
            {/* Inline error message shown when the rename API call fails */}
            {renameError && (
              <p className="text-[10px] text-red-500">{renameError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleRename}
                disabled={renameBusy}
                className="flex-1 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {renameBusy ? t('actions.saving') : t('actions.save')}
              </button>
              <button
                onClick={() => { setRenaming(false); setRenameError(null) }}
                disabled={renameBusy}
                className="flex-1 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition"
              >
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        ) : (
          /* Read-only view: just the filename in monospace */
          <p className="text-xs text-gray-600 font-mono truncate">{image.name}</p>
        )}
      </div>

      {/* ── Move to Folder ──
          Only rendered when there is at least one other folder to move to.
          Clicking the folder-plus icon reveals a dropdown of destination folders.
          - Selecting a folder and clicking Move triggers handleMove().
          - Any API error is shown in red beneath the dropdown.
          - Cancel resets back to the read-only "Currently in …" display. */}
      {otherFolders.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">
              {t('sections.moveToFolder')}
            </p>
            {!moving && (
              <button
                onClick={() => setMoving(true)}
                className="text-gray-400 hover:text-gray-700"
              >
                <FiFolderPlus size={12} />
              </button>
            )}
          </div>

          {moving ? (
            <div className="flex flex-col gap-2">
              <select
                value={moveFolder}
                onChange={(e) => setMoveFolder(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                {otherFolders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {/* Inline error message shown when the move API call fails */}
              {moveError && (
                <p className="text-[10px] text-red-500">{moveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleMove}
                  disabled={moveBusy}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  {moveBusy ? t('actions.moving') : t('actions.move')}
                </button>
                <button
                  onClick={() => { setMoving(false); setMoveError(null) }}
                  disabled={moveBusy}
                  className="flex-1 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  {t('actions.cancel')}
                </button>
              </div>
            </div>
          ) : (
            /* Read-only view: "Currently in FolderName" */
            <p className="text-xs text-gray-500">
              {t('move.currentlyIn')}{' '}
              <span className="font-medium text-gray-700">
                {folder?.name ?? image.folder}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── Delete ──
          A full-width red-bordered button at the bottom.
          Calls onDelete(image) — the parent component is responsible
          for showing a confirmation dialog before actually deleting. */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => onDelete(image)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition"
        >
          <FiTrash2 size={13} />
          {t('actions.deleteFile')}
        </button>
      </div>

    </div>
  )
}