'use client';

import { useState } from 'react';
import { FiFolder, FiCheck, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Folder } from '../types';
import NewFolderPopup from './NewFolderPopup';

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
  const [collapsed, setCollapsed] = useState(false)

  // Calculate min width based on longest folder name
  // Each char ~7px + icon + padding — but we clamp between 64px and 160px
  const longestName  = folders.reduce((max, f) => Math.max(max, f.name.length), 0)
  const collapsedWidth = Math.min(Math.max(longestName * 7 + 48, 64), 120)

  return (
    <aside
      className="shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto transition-all duration-300"
      style={{ width: collapsed ? collapsedWidth : 224 }}
    >

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-b border-gray-100 flex items-center justify-between min-h-[44px]">
        {!collapsed && (
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Folders
          </p>
        )}

        <div className={`flex items-center gap-2 ${collapsed ? 'w-full justify-center' : ''}`}>
          {!collapsed && (
            <>
              <button
                onClick={onShowAll}
                className="text-[10px] text-blue-500 hover:underline"
              >
                All
              </button>
              <button
                onClick={onToggleNewFolder}
                title="New folder"
                className="flex items-center justify-center w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
              >
                <FiPlus size={12} />
              </button>
            </>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <FiChevronRight size={13} /> : <FiChevronLeft size={13} />}
          </button>
        </div>
      </div>

      {/* ── New folder popup ────────────────────────────────────────── */}
      {showNewFolder && !collapsed && (
        <div className="pt-2">
          <NewFolderPopup onConfirm={onCreateFolder} onCancel={onCancelNewFolder} />
        </div>
      )}

      {/* ── Folder list ─────────────────────────────────────────────── */}
      <nav className="flex-1 py-2">
        {folders.map((folder) => {
          const isActive   = selectedFolder?.id === folder.id
          const isSelected = selectedFolders.has(folder.id)

          return collapsed ? (
            // ── Collapsed: icon on top, name below ──────────────────
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
            // ── Expanded: full row ────────────────────────────────────
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder)}
              className={`group flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors ${
                isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <div
                onClick={(e) => onToggleFolderSelect(folder.id, e)}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-opacity ${
                  isSelected
                    ? 'bg-gray-800 border-gray-800 opacity-100'
                    : 'border-gray-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {isSelected && <FiCheck size={10} className="text-white" />}
              </div>
              <FiFolder
                size={15}
                className={`shrink-0 ${isActive ? 'text-gray-700' : 'text-gray-400'}`}
              />
              <span
                className={`text-sm flex-1 truncate min-w-0 ${
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                }`}
              >
                {folder.name}
              </span>
              <span className="text-[10px] text-gray-400 shrink-0">{folder.count}</span>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}