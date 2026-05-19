'use client'

/**
 * @file MediaToolbar.tsx
 * @description
 * The top toolbar bar for the Media Library page. It sits above the folder
 * sidebar and the file grid/list and provides the user with:
 *
 * ─── What does this toolbar do? ──────────────────────────────────────────────
 *
 * 1. BREADCRUMB
 *    Shows the user where they are: "Media" at the root, or "Media › FolderName"
 *    when a folder is open. This helps with orientation in the library.
 *
 * 2. DELETE SELECTION
 *    Shown only when one or more files/folders are selected. Displays the count
 *    of selected items and triggers a bulk delete when clicked.
 *
 * 3. CLEAR SELECTION
 *    Shown alongside the delete button when items are selected. Deselects
 *    everything without deleting anything.
 *
 * 4. VIEW MODE TOGGLE
 *    A grid/list icon toggle shown only when inside a folder. Lets the user
 *    switch between the GridView (thumbnail cards) and ListView (table rows).
 *
 * 5. UPLOAD BUTTON
 *    Always visible. Opens the file upload dialog so the user can add new
 *    files to the current folder.
 *
 * ─── Design note ─────────────────────────────────────────────────────────────
 * This component is fully controlled — it holds no state of its own.
 * Every piece of data comes in as a prop and every action fires a callback.
 * This makes it easy to test and keeps all Media Library state in one place
 * (the parent MediaPage component).
 */

import { FiGrid, FiList, FiUpload, FiTrash2, FiChevronRight } from 'react-icons/fi'
import { useTranslations } from 'next-intl'
import { Folder } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * @interface MediaToolbarProps
 *
 * @prop {Folder | null}  selectedFolder    - The folder currently open, or null when
 *                                           the user is at the root (all folders view).
 *                                           Used to render the breadcrumb and to decide
 *                                           whether to show the view-mode toggle.
 * @prop {'grid'|'list'}  viewMode          - Which view is currently active. Controls
 *                                           which toggle button appears pressed.
 * @prop {number}         totalSelected     - How many files/folders are currently selected.
 *                                           Shown inside the Delete button label.
 * @prop {boolean}        anySelected       - True when totalSelected > 0. Used to
 *                                           conditionally show the Delete and Clear buttons.
 * @prop {Function}       onSetViewMode     - Called with 'grid' or 'list' when the user
 *                                           clicks a view toggle button.
 * @prop {Function}       onClearSelection  - Called when the user clicks "Clear" to
 *                                           deselect all selected items.
 * @prop {Function}       onUpload          - Called when the user clicks "Upload" to
 *                                           open the file upload dialog.
 * @prop {Function}       onDeleteSelection - Called when the user clicks the Delete button
 *                                           to bulk-delete all selected items.
 */
interface MediaToolbarProps {
  selectedFolder:    Folder | null
  viewMode:          'grid' | 'list'
  totalSelected:     number
  anySelected:       boolean
  onSetViewMode:     (mode: 'grid' | 'list') => void
  onClearSelection:  () => void
  onUpload:          () => void
  onDeleteSelection: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component MediaToolbar
 * @description
 * Renders the top action bar for the Media Library. Conditionally shows
 * bulk-action buttons when items are selected and the view-mode toggle
 * when inside a folder.
 *
 * All user-facing strings are loaded from the "mediaToolbar" namespace in en.json.
 *
 * @param {MediaToolbarProps} props - See interface above.
 * @returns {JSX.Element}
 */
export default function MediaToolbar({
  selectedFolder,
  viewMode,
  totalSelected,
  anySelected,
  onSetViewMode,
  onClearSelection,
  onUpload,
  onDeleteSelection,
}: MediaToolbarProps) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "mediaToolbar" namespace in en.json.
   */
  const t = useTranslations('mediaToolbar')

  return (
    <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-3">

      {/* ── Breadcrumb ──
          Always shows "Media" as the root label.
          When a folder is selected, appends a chevron and the folder name.
          The folder name truncates if too long to prevent layout overflow. */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-400 shrink-0">{t('breadcrumb.root')}</span>
        {selectedFolder && (
          <>
            <FiChevronRight size={14} className="text-gray-300 shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">
              {selectedFolder.name}
            </span>
          </>
        )}
      </div>

      {/* ── Right-side actions ── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* ── Delete Selection button ──
            Only rendered when at least one item is selected (anySelected = true).
            Shows the count of selected items so the user knows what will be deleted. */}
        {anySelected && (
          <button
            onClick={onDeleteSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
          >
            <FiTrash2 size={13} />
            {t('actions.delete', { count: totalSelected })}
          </button>
        )}

        {/* ── Clear Selection button ──
            Only rendered alongside the Delete button when items are selected.
            Deselects everything without performing any destructive action. */}
        {anySelected && (
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition"
          >
            {t('actions.clear')}
          </button>
        )}

        {/* ── View Mode Toggle ──
            Only rendered when the user is inside a folder (selectedFolder is set).
            Hidden at the root because the root always shows a folder grid, not files.
            The active mode button gets a grey background to appear "pressed". */}
        {selectedFolder && (
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => onSetViewMode('grid')}
              title={t('viewMode.grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <FiGrid size={15} />
            </button>
            <button
              onClick={() => onSetViewMode('list')}
              title={t('viewMode.list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <FiList size={15} />
            </button>
          </div>
        )}

        {/* ── Upload button ──
            Always visible regardless of folder or selection state.
            Triggers the parent's file upload dialog handler. */}
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition"
        >
          <FiUpload size={13} />
          {t('actions.upload')}
        </button>
      </div>
    </div>
  )
}