'use client'

/**
 * @file ListView.tsx
 * @description
 * An alternative view for the Media Library that displays files as a
 * structured table instead of the GridView's card grid.
 *
 * ─── When is this shown? ──────────────────────────────────────────────────────
 * The parent (MediaPage) toggles between GridView and ListView based on a
 * view-mode toggle button. ListView is only rendered when a folder is selected —
 * it does not have a "folder browser" mode like GridView does.
 *
 * ─── What does each row show? ─────────────────────────────────────────────────
 * Each file is rendered as a horizontal row containing:
 *   1. Checkbox        — for multi-select / bulk actions (hidden until hover).
 *   2. Thumbnail + Name — a small preview square next to the filename and path.
 *   3. Size            — human-readable file size (e.g. "240 KB").
 *   4. Type            — the file subtype extracted from the MIME string (e.g. "png").
 *   5. Uploaded        — the upload date string.
 *   6. Delete button   — red trash icon, hidden until hover.
 *
 * ─── Sub-components defined in this file ─────────────────────────────────────
 * • FileThumb — renders a small square preview for each file (image or icon).
 * • ListView  — the exported root component with the table header and rows.
 */

import { useState } from 'react'
import { FiCheck, FiTrash2, FiFile, FiImage, FiFilm, FiFileText } from 'react-icons/fi'
import { useTranslations } from 'next-intl'
import { MediaItem } from '../types'

// ─── FileThumb ────────────────────────────────────────────────────────────────

/**
 * @component FileThumb
 * @description
 * Renders a small 32×32px square preview for a single media file.
 *
 * For IMAGE files:
 *   Shows a real thumbnail loaded from the file's URL. While the image is
 *   loading a grey animated pulse placeholder is shown so the row does not
 *   jump. Once loaded, the image fades in smoothly.
 *
 * For all OTHER file types:
 *   Shows a grey icon chosen by MIME type:
 *     - video/*             → film strip icon
 *     - application/pdf     → document icon
 *     - application/document→ document icon
 *     - anything else       → generic file icon
 *
 * @prop {MediaItem} item - The file whose thumbnail should be rendered.
 */
function FileThumb({ item }: { item: MediaItem }) {
  /**
   * `loaded` tracks whether the <img> element has finished loading from the network.
   * While false a skeleton pulse div is layered on top of the image container.
   */
  const [loaded, setLoaded] = useState(false)

  /** True when the file's MIME type begins with "image/" (e.g. "image/png"). */
  const isImage = item.mimeType?.startsWith('image/')

  if (isImage) {
    return (
      <div className="w-8 h-8 rounded border border-gray-200 shrink-0 overflow-hidden relative bg-gray-100">
        {/* Skeleton pulse shown until the image has fully loaded */}
        {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
        <img
          src={item.url}
          alt={item.name}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    )
  }

  /**
   * Pick the most descriptive icon for non-image file types.
   * Falls back to the generic FiFile icon for any unrecognised MIME type.
   */
  const Icon = item.mimeType?.startsWith('video/')
             ? FiFilm
             : item.mimeType?.includes('pdf') || item.mimeType?.includes('document')
             ? FiFileText
             : FiFile

  return (
    <div className="w-8 h-8 rounded border border-gray-200 shrink-0 flex items-center justify-center bg-gray-50">
      <Icon size={14} className="text-gray-400" />
    </div>
  )
}

// ─── ListView Props ───────────────────────────────────────────────────────────

/**
 * @interface ListViewProps
 *
 * @prop {MediaItem[]}   folderImages        - The files to display as rows.
 *                                            These are already filtered to the
 *                                            selected folder by the parent.
 * @prop {Set<string>}   selectedImages      - Ids of files currently multi-selected
 *                                            (their checkboxes will appear ticked).
 * @prop {MediaItem|null} activeImage        - The file currently open in the
 *                                            DetailPanel (highlighted row).
 * @prop {Function}      onToggleImageSelect - Called with (id, event) when the
 *                                            user clicks a row's checkbox.
 * @prop {Function}      onSetActiveImage    - Called with the MediaItem when the
 *                                            user clicks a row body (opens details).
 * @prop {Function}      onDeleteFile        - Called with the MediaItem when the
 *                                            user clicks the row's delete button.
 */
interface ListViewProps {
  folderImages:        MediaItem[]
  selectedImages:      Set<string>
  activeImage:         MediaItem | null
  onToggleImageSelect: (id: string, e: React.MouseEvent) => void
  onSetActiveImage:    (item: MediaItem) => void
  onDeleteFile:        (item: MediaItem) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component ListView
 * @description
 * Renders the file list as a structured table with a sticky header row.
 * Shows an empty-state message when the current folder contains no files.
 *
 * All user-facing strings are loaded from the "listView" namespace in en.json.
 *
 * @param {ListViewProps} props - See interface above.
 * @returns {JSX.Element}
 */
export default function ListView({
  folderImages,
  selectedImages,
  activeImage,
  onToggleImageSelect,
  onSetActiveImage,
  onDeleteFile,
}: ListViewProps) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "listView" namespace in en.json.
   */
  const t = useTranslations('listView')

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (folderImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        {t('empty.message')}
      </div>
    )
  }

  // ── Table ─────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

      {/* ── Table Header ──
          Uses CSS grid to align columns with the data rows below.
          Column order: [checkbox] [name] [size] [type] [uploaded] [delete] */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div />
        <p className="text-[10px] font-semibold text-gray-400 uppercase">{t('header.name')}</p>
        <p className="text-[10px] font-semibold text-gray-400 uppercase">{t('header.size')}</p>
        <p className="text-[10px] font-semibold text-gray-400 uppercase">{t('header.type')}</p>
        <p className="text-[10px] font-semibold text-gray-400 uppercase">{t('header.uploaded')}</p>
        <div />
      </div>

      {/* ── Table Rows ── */}
      {folderImages.map((item) => {
        /**
         * `isSelected` — true when this file is in the multi-select set.
         *                Keeps its checkbox ticked even when not hovering.
         * `isActive`   — true when this file's details are open in the panel.
         *                Highlights the row with a grey background.
         */
        const isSelected = selectedImages.has(item.id)
        const isActive   = activeImage?.id === item.id

        return (
          <div
            key={item.id}
            onClick={() => onSetActiveImage(item)}
            className={`group grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${
              isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
            }`}
          >
            {/* ── Checkbox ──
                Hidden by default; fades in on row hover.
                Stays visible when the file is selected.
                stopPropagation prevents the click from also firing onSetActiveImage. */}
            <div
              onClick={(e) => onToggleImageSelect(item.id, e)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-opacity ${
                isSelected
                  ? 'bg-gray-800 border-gray-800 opacity-100'
                  : 'border-gray-300 opacity-0 group-hover:opacity-100'
              }`}
            >
              {isSelected && <FiCheck size={10} className="text-white" />}
            </div>

            {/* ── Name + Thumbnail ──
                FileThumb on the left; filename and folder path stacked on the right.
                The outer div is min-w-0 so long names truncate instead of overflowing. */}
            <div className="flex items-center gap-2.5 min-w-0">
              <FileThumb item={item} />
              <div className="min-w-0">
                <p className="text-sm text-gray-700 font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{item.folderPath}</p>
              </div>
            </div>

            {/* ── Size ── e.g. "240 KB" */}
            <p className="text-xs text-gray-400 whitespace-nowrap">{item.size}</p>

            {/* ── Type ──
                We show only the subtype portion of the MIME string for brevity.
                e.g. "image/png" becomes "png". Falls back to "—" if unavailable. */}
            <p className="text-xs text-gray-400 whitespace-nowrap">
              {item.mimeType?.split('/')[1] ?? '—'}
            </p>

            {/* ── Uploaded date ── */}
            <p className="text-xs text-gray-400 whitespace-nowrap">{item.uploaded}</p>

            {/* ── Delete button ──
                Hidden until row is hovered. stopPropagation prevents the click
                from also triggering onSetActiveImage on the row. */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFile(item) }}
              title={t('row.deleteTitle')}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}