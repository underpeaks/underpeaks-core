'use client'

import { useState } from 'react'
import { FiFolder, FiCheck, FiTrash2, FiFile, FiImage, FiFilm, FiFileText } from 'react-icons/fi'
import { MediaItem, Folder } from '../types'

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/'))       return <FiImage    size={24} className="text-gray-300" />
  if (mimeType.startsWith('video/'))       return <FiFilm     size={24} className="text-gray-300" />
  if (mimeType.includes('pdf') || mimeType.includes('document'))
                                           return <FiFileText size={24} className="text-gray-300" />
  return                                          <FiFile     size={24} className="text-gray-300" />
}

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
  const [loaded, setLoaded] = useState(false)
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

      <div className="px-2 py-1.5">
        <p className="text-xs font-medium text-gray-700 truncate">{item.name}</p>
        <p className="text-[10px] text-gray-400">{item.size}</p>
      </div>
    </div>
  )
}

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
  if (!selectedFolder) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onSelectFolder(folder)}
            className="group relative bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-gray-300 hover:shadow-sm transition"
          >
            {/* Checkbox */}
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

            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder) }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            >
              <FiTrash2 size={13} />
            </button>

            <FiFolder size={36} className="text-gray-300" />
            <p className="text-sm font-medium text-gray-700">{folder.name}</p>
            <p className="text-xs text-gray-400">{folder.count} files</p>
          </div>
        ))}
      </div>
    )
  }

  if (folderImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
        <FiFolder size={32} className="text-gray-200" />
        <p className="text-sm">This folder is empty</p>
      </div>
    )
  }

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