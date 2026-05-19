'use client';

/**
 * @file FolderSidebar.tsx
 * @description
 * A collapsible sidebar that displays all media folders in the Media Library.
 * It sits on the left side of the page and lets the user:
 *
 * ─── What can the user do here? ──────────────────────────────────────────────
 *
 * 1. BROWSE FOLDERS   — Click any folder row to filter the media grid to that folder.
 * 2. SELECT FOLDERS   — Tick the checkbox that appears on hover to multi-select folders
 *                       (used for bulk actions like bulk delete).
 * 3. SHOW ALL         — Click "All" to clear the folder filter and show every file.
 * 4. CREATE FOLDER    — Click the + button to open the NewFolderPopup inline form.
 * 5. COLLAPSE/EXPAND  — Click the chevron button to collapse the sidebar into a narrow
 *                       icon-only strip, giving more space to the media grid.
 *
 * ─── Collapsed vs Expanded ───────────────────────────────────────────────────
 * When EXPANDED (default): each folder shows a checkbox, folder icon, name, and count.
 * When COLLAPSED: each folder shows only the icon and a truncated name stacked vertically.
 * The collapsed width is calculated dynamically based on the longest folder name so
 * that names are never clipped more than necessary.
 *
 * ─── Props flow ──────────────────────────────────────────────────────────────
 * This component is fully controlled — it holds NO folder data of its own.
 * All folder state lives in the parent (MediaPage) and flows down as props.
 * User actions fire callbacks (onSelectFolder, onCreateFolder, etc.) up to the parent.
 */

import { useState } from 'react';
import { FiFolder, FiCheck, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { Folder } from '../types';
import NewFolderPopup from './NewFolderPopup';

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * @interface FolderSidebarProps
 *
 * @prop {Folder[]}        folders              - The full list of folders to display.
 * @prop {Folder | null}   selectedFolder       - The folder currently being browsed,
 *                                               or null if "All" is selected.
 * @prop {Set<string>}     selectedFolders      - Set of folder ids that are currently
 *                                               checked (multi-selected) for bulk actions.
 * @prop {boolean}         showNewFolder        - Whether the NewFolderPopup form is open.
 * @prop {Function}        onSelectFolder       - Called when the user clicks a folder row
 *                                               to browse its contents.
 * @prop {Function}        onToggleFolderSelect - Called when the user clicks a folder's
 *                                               checkbox to add/remove it from the
 *                                               multi-selection set.
 * @prop {Function}        onShowAll            - Called when the user clicks "All" to
 *                                               clear the active folder filter.
 * @prop {Function}        onToggleNewFolder    - Called when the user clicks the + button
 *                                               to open or close the new-folder form.
 * @prop {Function}        onCreateFolder       - Called with the new folder name string
 *                                               when the user confirms creation.
 * @prop {Function}        onCancelNewFolder    - Called when the user cancels the
 *                                               new-folder form without creating anything.
 */
interface FolderSidebarProps {
  folders:              Folder[];
  selectedFolder:       Folder | null;
  selectedFolders:      Set<string>;
  showNewFolder:        boolean;
  onSelectFolder:       (folder: Folder) => void;
  onToggleFolderSelect: (id: string, e: React.MouseEvent) => void;
  onShowAll:            () => void;
  onToggleNewFolder:    () => void;
  onCreateFolder:       (name: string) => void;
  onCancelNewFolder:    () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component FolderSidebar
 * @description
 * Renders the left-hand folder navigation sidebar for the Media Library.
 * All user-facing strings are loaded from the "folderSidebar" namespace in en.json.
 *
 * @param {FolderSidebarProps} props - See interface above.
 * @returns {JSX.Element}
 */
export default function FolderSidebar({
  folders,
  selectedFolder,
  selectedFolders,
  showNewFolder,
  onSelectFolder,
  onToggleFolderSelect,
  onShowAll,
  onToggleNewFolder,
  onCreateFolder,
  onCancelNewFolder,
}: FolderSidebarProps) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "folderSidebar" namespace in en.json.
   */
  const t = useTranslations('folderSidebar');

  // ─── Local State ─────────────────────────────────────────────────────────────

  /**
   * `collapsed` — when true the sidebar is in its narrow icon-only mode.
   * Toggled by the chevron button in the header.
   * Defaults to false (expanded) on first render.
   */
  const [collapsed, setCollapsed] = useState(false);

  // ─── Derived Values ──────────────────────────────────────────────────────────

  /**
   * Calculate the width of the collapsed sidebar dynamically.
   *
   * Why dynamic? We want the collapsed sidebar to be just wide enough to show
   * the truncated folder names without being unnecessarily wide or too narrow.
   *
   * How it works:
   *   1. Find the character length of the longest folder name.
   *   2. Estimate its pixel width: each character ≈ 7px, plus ~48px for the icon and padding.
   *   3. Clamp the result between 64px (minimum usable width) and 120px (maximum).
   */
  const longestName    = folders.reduce((max, f) => Math.max(max, f.name.length), 0);
  const collapsedWidth = Math.min(Math.max(longestName * 7 + 48, 64), 120);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <aside
      className="shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto transition-all duration-300"
      style={{ width: collapsed ? collapsedWidth : 224 }}
    >

      {/* ── Header ──
          Shows the "Folders" label, "All" link, and "+" new-folder button
          when expanded. When collapsed, only the collapse/expand chevron is shown. */}
      <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between min-h-[44px]">
        {!collapsed && (
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {t('header.title')}
          </p>
        )}

        <div className={`flex items-center gap-2 ${collapsed ? 'w-full justify-center' : ''}`}>
          {!collapsed && (
            <>
              {/* "All" link — clears the active folder filter */}
              <button
                onClick={onShowAll}
                className="text-[10px] text-blue-500 hover:underline"
              >
                {t('header.all')}
              </button>

              {/* "+" button — opens the NewFolderPopup inline form */}
              <button
                onClick={onToggleNewFolder}
                title={t('header.newFolderTitle')}
                className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
              >
                <FiPlus size={12} />
              </button>
            </>
          )}

          {/* Collapse / Expand chevron button */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
            title={collapsed ? t('header.expand') : t('header.collapse')}
          >
            {collapsed ? <FiChevronRight size={13} /> : <FiChevronLeft size={13} />}
          </button>
        </div>
      </div>

      {/* ── New Folder Popup ──
          Only rendered when showNewFolder is true AND the sidebar is expanded.
          The popup is hidden in collapsed mode because there is not enough space. */}
      {showNewFolder && !collapsed && (
        <div className="pt-2">
          <NewFolderPopup onConfirm={onCreateFolder} onCancel={onCancelNewFolder} />
        </div>
      )}

      {/* ── Folder List ──
          Iterates over all folders and renders each one differently depending on
          whether the sidebar is collapsed or expanded (see comments per branch). */}
      <nav className="flex-1 py-2">
        {folders.map((folder) => {

          /**
           * `isActive`   — true when this folder is the one currently being browsed.
           *                Used to highlight the row and bold the folder name.
           * `isSelected` — true when this folder's id is in the selectedFolders Set.
           *                Used to show the checkbox as ticked.
           */
          const isActive   = selectedFolder?.id === folder.id;
          const isSelected = selectedFolders.has(folder.id);

          return collapsed ? (

            // ── Collapsed layout ──────────────────────────────────────────────
            // Icon centred above the folder name (very narrow, stacked vertically).
            // Clicking anywhere on the row selects the folder.
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder)}
              title={folder.name}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 cursor-pointer transition-colors ${
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <FiFolder
                size={16}
                className={isActive ? 'text-gray-700' : 'text-gray-400'}
              />
              <span
                className={`text-[10px] text-center leading-tight truncate w-full px-1 ${
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-500'
                }`}
              >
                {folder.name}
              </span>
              {folder.count > 0 && (
                <span className="text-[9px] text-gray-400">{folder.count}</span>
              )}
            </div>

          ) : (

            // ── Expanded layout ───────────────────────────────────────────────
            // Full row: checkbox (visible on hover or when selected) + folder icon
            // + folder name + file count badge.
            //
            // The checkbox uses stopPropagation so clicking it does NOT also
            // trigger onSelectFolder on the parent row — they are independent actions.
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder)}
              className={`group flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              {/* Checkbox — hidden until hover, always shown when ticked */}
              <div
                onClick={(e) => onToggleFolderSelect(folder.id, e)}
                title={t('folder.selectTitle')}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-opacity ${
                  isSelected
                    ? 'bg-gray-800 border-gray-800 opacity-100'
                    : 'border-gray-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {isSelected && <FiCheck size={10} className="text-white" />}
              </div>

              {/* Folder icon */}
              <FiFolder
                size={15}
                className={`shrink-0 ${isActive ? 'text-gray-700' : 'text-gray-400'}`}
              />

              {/* Folder name */}
              <span
                className={`text-sm flex-1 truncate min-w-0 ${
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                }`}
              >
                {folder.name}
              </span>

              {/* File count badge */}
              <span className="text-[10px] text-gray-400 shrink-0">{folder.count}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}