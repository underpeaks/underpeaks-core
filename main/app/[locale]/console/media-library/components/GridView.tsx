'use client'

/**
 * @file GridView.tsx
 * @description
 * The main content area of the Media Library rendered as a responsive grid.
 * What is shown in the grid depends on whether a folder is currently selected:
 *
 * ─── Two display modes ────────────────────────────────────────────────────────
 *
 * 1. NO FOLDER SELECTED (folder browser mode)
 *    Shows a grid of folder cards. Each card displays a folder icon, the folder
 *    name, and a file count. Hovering reveals a checkbox (for multi-select) and
 *    a delete button. Clicking a card navigates into that folder.
 *
 * 2. FOLDER SELECTED (file browser mode)
 *    Shows a grid of MediaTile cards — one per file inside the selected folder.
 *    If the folder is empty an empty-state message is shown instead.
 *    Each tile shows a preview (image thumbnail or file-type icon), the file
 *    name, and its size. Clicking a tile opens its details in the DetailPanel.
 *
 * ─── Sub-components defined in this file ─────────────────────────────────────
 *
 * • FileIcon   — Picks the right icon based on a file's MIME type.
 * • MediaTile  — A single file card with checkbox, preview, name, and size.
 * • GridView   — The exported root component that decides which mode to render.
 */

import { useState } from 'react'
import { FiFolder, FiCheck, FiTrash2, FiFile, FiImage, FiFilm, FiFileText } from 'react-icons/fi'
import { useTranslations } from 'next-intl'
import { MediaItem, Folder } from '../types'

// ─── FileIcon ─────────────────────────────────────────────────────────────────

/**
 * @component FileIcon
 * @description
 * Renders the correct icon for a file based on its MIME type string.
 * This is used inside MediaTile for non-image files (videos, PDFs, documents,
 * and any other type) so the user still gets a meaningful visual hint.
 *
 * @param {{ mimeType: string }} props
 * @prop {string} mimeType - The file's MIME type (e.g. "video/mp4", "application/pdf").
 */
function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/'))                               return <FiImage    size={24} className="text-gray-300" />
  if (mimeType.startsWith('video/'))                               return <FiFilm     size={24} className="text-gray-300" />
  if (mimeType.includes('pdf') || mimeType.includes('document'))   return <FiFileText size={24} className="text-gray-300" />
  return                                                                  <FiFile     size={24} className="text-gray-300" />
}

// ─── MediaTile ────────────────────────────────────────────────────────────────

/**
 * @component MediaTile
 * @description
 * A single card in the file grid representing one media item (image, video,
 * document, etc.).
 *
 * ─── Visual structure ─────────────────────────────────────────────────────────
 * ┌───────────────────┐
 * │ ☑  [checkbox]     │  ← appears on hover or when selected
 * │                   │
 * │   [preview area]  │  ← image thumbnail OR file-type icon
 * │                   │
 * ├───────────────────┤
 * │ filename.jpg      │  ← truncated file name
 * │ 240 KB            │  ← file size
 * └───────────────────┘
 *
 * ─── Image loading ────────────────────────────────────────────────────────────
 * Images use a "loaded" state flag. Until the <img> fires its onLoad event,
 * a grey animated pulse placeholder is shown so the grid does not jump around
 * as images arrive from the network.
 *
 * ─── Active vs Selected ───────────────────────────────────────────────────────
 * • `isActive`   — the tile whose details are currently open in the DetailPanel.
 *                  Gets a dark border + ring highlight.
 * • `isSelected` — the tile is checked for a bulk action (delete, move, etc.).
 *                  The checkbox in the top-left is shown filled.
 * These two states are independent — a tile can be both at once.
 *
 * @prop {MediaItem} item           - The file data to display.
 * @prop {boolean}   isSelected     - Whether this tile's checkbox is ticked.
 * @prop {boolean}   isActive       - Whether this tile is currently open in the panel.
 * @prop {Function}  onToggleSelect - Called with (id, event) when the checkbox is clicked.
 * @prop {Function}  onSetActive    - Called with the MediaItem when the tile body is clicked.
 */
function MediaTile({
  item,
  isSelected,
  isActive,
  onToggleSelect,
  onSetActive,
}: {
  item:           MediaItem
  isSelected:     boolean
  isActive:       boolean
  onToggleSelect: (id: string, e: React.MouseEvent) => void
  onSetActive:    (item: MediaItem) => void
}) {
  /**
   * `loaded` tracks whether the <img> element has finished loading.
   * While false, a skeleton pulse placeholder is rendered over the image area.
   */
  const [loaded, setLoaded] = useState(false)

  /** True when the file is an image — determines which preview element is rendered. */
  const isImage = item.mimeType?.startsWith('image/')

  return (
    <div
      onClick={() => onSetActive(item)}
      className={`group relative bg-white border rounded-lg overflow-hidden cursor-pointer transition ${
        isActive
          ? 'border-gray-800 ring-2 ring-gray-800 ring-offset-1'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* ── Checkbox ──
          Sits in the top-left corner of the tile.
          Hidden by default; appears on hover or stays visible when ticked.
          stopPropagation prevents the click from also firing onSetActive. */}
      <div
        onClick={(e) => onToggleSelect(item.id, e)}
        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-opacity ${
          isSelected
            ? 'bg-gray-800 border-gray-800 opacity-100'
            : 'bg-white border-gray-300 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <FiCheck size={11} className="text-white" />}
      </div>

      {/* ── Preview area ──
          Images: shows a skeleton pulse until loaded, then fades the image in.
          Non-images: shows a centred file-type icon on a light grey background. */}
      {isImage ? (
        <div className="w-full aspect-square relative bg-gray-100">
          {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
          <img
            src={item.url}
            alt={item.name}
            onLoad={() => setLoaded(true)}
            className={`w-full aspect-square object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
          />
        </div>
      ) : (
        <div className="w-full aspect-square flex items-center justify-center bg-gray-50">
          <FileIcon mimeType={item.mimeType} />
        </div>
      )}

      {/* ── File info ── Name (truncated) and size */}
      <div className="px-2 py-1.5">
        <p className="text-xs font-medium text-gray-700 truncate">{item.name}</p>
        <p className="text-[10px] text-gray-400">{item.size}</p>
      </div>
    </div>
  )
}

// ─── GridView Props ───────────────────────────────────────────────────────────

/**
 * @interface GridViewProps
 *
 * @prop {Folder[]}        folders              - All folders available in the library.
 * @prop {MediaItem[]}     folderImages         - Files inside the currently selected folder.
 * @prop {Folder | null}   selectedFolder       - The active folder, or null for the root view.
 * @prop {Set<string>}     selectedImages       - Ids of files currently multi-selected.
 * @prop {Set<string>}     selectedFolders      - Ids of folders currently multi-selected.
 * @prop {MediaItem|null}  activeImage          - The file whose details are open in the panel.
 * @prop {Function}        onSelectFolder       - Called when a folder card is clicked.
 * @prop {Function}        onToggleFolderSelect - Called when a folder's checkbox is clicked.
 * @prop {Function}        onToggleImageSelect  - Called when a file tile's checkbox is clicked.
 * @prop {Function}        onSetActiveImage     - Called when a file tile body is clicked.
 * @prop {Function}        onDeleteFolder       - Called when a folder's delete button is clicked.
 */
interface GridViewProps {
  folders:              Folder[]
  folderImages:         MediaItem[]
  selectedFolder:       Folder | null
  selectedImages:       Set<string>
  selectedFolders:      Set<string>
  activeImage:          MediaItem | null
  onSelectFolder:       (folder: Folder) => void
  onToggleFolderSelect: (id: string, e: React.MouseEvent) => void
  onToggleImageSelect:  (id: string, e: React.MouseEvent) => void
  onSetActiveImage:     (item: MediaItem) => void
  onDeleteFolder:       (folder: Folder) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component GridView
 * @description
 * The root grid component for the Media Library. Decides which of the three
 * possible views to render based on the current state:
 *
 *   • selectedFolder === null  → folder browser grid
 *   • selectedFolder set, but folderImages is empty → empty-state message
 *   • selectedFolder set, folderImages has items → file tile grid
 *
 * All user-facing strings are loaded from the "gridView" namespace in en.json.
 *
 * @param {GridViewProps} props - See interface above.
 * @returns {JSX.Element}
 */
export default function GridView({
  folders,
  folderImages,
  selectedFolder,
  selectedImages,
  selectedFolders,
  activeImage,
  onSelectFolder,
  onToggleFolderSelect,
  onToggleImageSelect,
  onSetActiveImage,
  onDeleteFolder,
}: GridViewProps) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "gridView" namespace in en.json.
   */
  const t = useTranslations('gridView')

  // ── Mode 1: No folder selected — show the folder browser grid ────────────────
  if (!selectedFolder) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onSelectFolder(folder)}
            className="group relative bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-gray-300 hover:shadow-sm transition"
          >
            {/* Checkbox — hidden until hover, always shown when ticked */}
            <div
              onClick={(e) => onToggleFolderSelect(folder.id, e)}
              className={`absolute top-2 left-2 w-4 h-4 rounded border flex items-center justify-center transition-opacity ${
                selectedFolders.has(folder.id)
                  ? 'bg-gray-800 border-gray-800 opacity-100'
                  : 'border-gray-300 opacity-0 group-hover:opacity-100'
              }`}
            >
              {selectedFolders.has(folder.id) && <FiCheck size={10} className="text-white" />}
            </div>

            {/* Delete button — hidden until hover, top-right corner.
                stopPropagation prevents the click opening the folder. */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder) }}
              title={t('folder.deleteTitle')}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            >
              <FiTrash2 size={13} />
            </button>

            <FiFolder size={36} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-700">{folder.name}</p>
            <p className="text-xs text-gray-400">
              {t('folder.fileCount', { count: folder.count })}
            </p>
          </div>
        ))}
      </div>
    )
  }

  // ── Mode 2: Folder selected but empty — show empty state ─────────────────────
  if (folderImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
        <FiFolder size={32} className="text-gray-200" />
        <p className="text-sm">{t('empty.message')}</p>
      </div>
    )
  }

  // ── Mode 3: Folder selected with files — show file tile grid ──────────────────
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {folderImages.map((item) => (
        <MediaTile
          key={item.id}
          item={item}
          isSelected={selectedImages.has(item.id)}
          isActive={activeImage?.id === item.id}
          onToggleSelect={onToggleImageSelect}
          onSetActive={onSetActiveImage}
        />
      ))}
    </div>
  )
}