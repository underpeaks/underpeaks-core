'use client'

import { FiGrid, FiList, FiUpload, FiTrash2, FiChevronRight } from 'react-icons/fi'
import { Folder } from '../types'

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
  return (
    <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-3">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-gray-400 shrink-0">Media</span>
        {selectedFolder && (
          <>
            <FiChevronRight size={14} className="text-gray-300 shrink-0" />
            <span className="text-sm font-semibold text-gray-800 truncate">
              {selectedFolder.name}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">

        {/* Delete selection */}
        {anySelected && (
          <button
            onClick={onDeleteSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition"
          >
            <FiTrash2 size={13} />
            Delete ({totalSelected})
          </button>
        )}

        {/* Clear selection */}
        {anySelected && (
          <button
            onClick={onClearSelection}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition"
          >
            Clear
          </button>
        )}

        {/* View mode toggle */}
        {selectedFolder && (
          <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
            <button
              onClick={() => onSetViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <FiGrid size={15} />
            </button>
            <button
              onClick={() => onSetViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <FiList size={15} />
            </button>
          </div>
        )}

        {/* Upload */}
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition"
        >
          <FiUpload size={13} />
          Upload
        </button>
      </div>
    </div>
  )
}