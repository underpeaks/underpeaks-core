'use client'

import { useState } from 'react'
import {
  FiX, FiCheck, FiLink, FiTrash2, FiFile,
  FiFileText, FiEdit2, FiFolderPlus,
} from 'react-icons/fi'
import { MediaItem, Folder } from '../types'

interface DetailPanelProps {
  image:    MediaItem
  folders:  Folder[]
  onClose:  () => void
  onDelete: (item: MediaItem) => void
  onRename: (item: MediaItem, newName: string) => void
  onMove:   (item: MediaItem, toFolder: string) => void
}

export default function DetailPanel({
  image, folders, onClose, onDelete, onRename, onMove,
}: DetailPanelProps) {
  const [copied,      setCopied]      = useState(false)
  const [renaming,    setRenaming]    = useState(false)
  const [newName,     setNewName]     = useState(image.name)
  const [renameBusy,  setRenameBusy]  = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [moving,      setMoving]      = useState(false)
  const [moveFolder,  setMoveFolder]  = useState(image.folder)
  const [moveBusy,    setMoveBusy]    = useState(false)
  const [moveError,   setMoveError]   = useState<string | null>(null)

  const copy = () => {
    navigator.clipboard.writeText(image.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      if (!res.ok) throw new Error(data.error ?? 'Rename failed')
      onRename(image, trimmed)
      setRenaming(false)
    } catch (err: any) {
      setRenameError(err.message)
    } finally {
      setRenameBusy(false)
    }
  }

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
      if (!res.ok) throw new Error(data.error ?? 'Move failed')
      onMove(image, moveFolder)
      setMoving(false)
    } catch (err: any) {
      setMoveError(err.message)
    } finally {
      setMoveBusy(false)
    }
  }

  const folder  = folders.find((f) => f.id === image.folder)
  const isImage = image.mimeType?.startsWith('image/')
  const isVideo = image.mimeType?.startsWith('video/')

  // Other folders to move to — exclude current
  const otherFolders = folders.filter((f) => f.id !== image.folder)

  return (
    <div className="w-64 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700 truncate">{image.name}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0 ml-2">
          <FiX size={16} />
        </button>
      </div>

      {/* Preview */}
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

      {/* URL copy */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">File URL</p>
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

      {/* Metadata */}
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Metadata</p>
        <div className="flex flex-col gap-2.5">
          {[
            { label: 'Folder',   value: folder?.name ?? image.folder ?? '—' },
            { label: 'Path',     value: image.folderPath                     },
            { label: 'Size',     value: image.size                           },
            { label: 'Type',     value: image.mimeType                       },
            { label: 'Uploaded', value: image.uploaded                       },
            ...(image.dimensions ? [{ label: 'Dimensions', value: image.dimensions }] : []),
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-start gap-3">
              <span className="text-xs text-gray-400 shrink-0">{row.label}</span>
              <span className="text-xs text-gray-700 font-medium text-right break-all">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rename */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Rename</p>
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
            {renameError && (
              <p className="text-[10px] text-red-500">{renameError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleRename}
                disabled={renameBusy}
                className="flex-1 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {renameBusy ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setRenaming(false); setRenameError(null) }}
                disabled={renameBusy}
                className="flex-1 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600 font-mono truncate">{image.name}</p>
        )}
      </div>

      {/* Move */}
      {otherFolders.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase">Move to Folder</p>
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
              {moveError && (
                <p className="text-[10px] text-red-500">{moveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleMove}
                  disabled={moveBusy}
                  className="flex-1 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
                >
                  {moveBusy ? 'Moving…' : 'Move'}
                </button>
                <button
                  onClick={() => { setMoving(false); setMoveError(null) }}
                  disabled={moveBusy}
                  className="flex-1 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Currently in <span className="font-medium text-gray-700">{folder?.name ?? image.folder}</span>
            </p>
          )}
        </div>
      )}

      {/* Delete */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => onDelete(image)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition"
        >
          <FiTrash2 size={13} />
          Delete File
        </button>
      </div>

    </div>
  )
}