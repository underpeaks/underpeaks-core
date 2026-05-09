'use client'

import { useState } from 'react'
import { FiCheck, FiTrash2, FiFile, FiImage, FiFilm, FiFileText } from 'react-icons/fi'
import { MediaItem } from '../types'

function FileThumb({ item }: { item: MediaItem }) {
  const [loaded, setLoaded] = useState(false)
  const isImage = item.mimeType?.startsWith('image/')

  if (isImage) {
    return (
      <div className="w-8 h-8 rounded border border-gray-200 shrink-0 overflow-hidden relative bg-gray-100">
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

  const Icon = item.mimeType?.startsWith('video/')   ? FiFilm
             : item.mimeType?.includes('pdf')        ? FiFileText
             : item.mimeType?.includes('document')   ? FiFileText
             : FiFile

  return (
    <div className="w-8 h-8 rounded border border-gray-200 shrink-0 flex items-center justify-center bg-gray-50">
      <Icon size={14} className="text-gray-400" />
    </div>
  )
}

interface ListViewProps {
  folderImages:        MediaItem[]
  selectedImages:      Set<string>
  activeImage:         MediaItem | null
  onToggleImageSelect: (id: string, e: React.MouseEvent) => void
  onSetActiveImage:    (item: MediaItem) => void
  onDeleteFile:        (item: MediaItem) => void
}

export default function ListView({
  folderImages,
  selectedImages,
  activeImage,
  onToggleImageSelect,
  onSetActiveImage,
  onDeleteFile,
}: ListViewProps) {
  if (folderImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        This folder is empty
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div />
        <p className="text-[10px] font-semibold text-gray-400 uppercase">Name</p>
        <p className="text-[10px] font-semibold text-gray-400 uppercase">Size</p>
        <p className="text-[10px] font-semibold text-gray-400 uppercase">Type</p>
        <p className="text-[10px] font-semibold text-gray-400 uppercase">Uploaded</p>
        <div />
      </div>

      {folderImages.map((item) => {
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
            {/* Checkbox */}
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

            {/* Name + thumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              <FileThumb item={item} />
              <div className="min-w-0">
                <p className="text-sm text-gray-700 font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">{item.folderPath}</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 whitespace-nowrap">{item.size}</p>
            <p className="text-xs text-gray-400 whitespace-nowrap">{item.mimeType?.split('/')[1] ?? '—'}</p>
            <p className="text-xs text-gray-400 whitespace-nowrap">{item.uploaded}</p>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteFile(item) }}
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