'use client'

import { useState, useEffect } from 'react'
import { MediaItem, Folder } from './types'
import FolderSidebar from './components/FolderSidebar'
import MediaToolbar  from './components/MediaToolbar'
import GridView      from './components/GridView'
import ListView      from './components/ListView'
import DetailPanel   from './components/DetailPanel'
import UploadDialog  from './components/UploadDialog'
import Loader        from '../Loading'

export default function MediaPage() {
  const [folders,         setFolders]        = useState<Folder[]>([])
  const [folderItems,     setFolderItems]    = useState<MediaItem[]>([])
  const [selectedFolder,  setSelectedFolder] = useState<Folder | null>(null)
  const [viewMode,        setViewMode]       = useState<'grid' | 'list'>('grid')
  const [selectedImages,  setSelectedImages] = useState<Set<string>>(new Set())
  const [selectedFolders, setSelectedFolders]= useState<Set<string>>(new Set())
  const [activeImage,     setActiveImage]    = useState<MediaItem | null>(null)
  const [uploadOpen,      setUploadOpen]     = useState(false)
  const [showNewFolder,   setShowNewFolder]  = useState(false)
  const [loadingPage,     setLoadingPage]    = useState(true)
  const [loadingItems,    setLoadingItems]   = useState(false)
  const [confirmDelete,   setConfirmDelete]  = useState<{
    type: 'file' | 'folder' | 'selection'
    label: string
    onConfirm: () => Promise<void>
  } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // ── Load folders on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingPage(true)
      try {
        const res  = await fetch('/api/storage/list-folders')
        const data = await res.json()
        const folderData: { name: string; count: number }[] = data.folders ?? []
        setFolders(folderData.map(({ name, count }) => ({
          id:    name,
          name:  name.charAt(0).toUpperCase() + name.slice(1),
          count,
        })))
      } catch {
        setError('Failed to load folders')
      } finally {
        setLoadingPage(false)
      }
    }
    load()
  }, [])

  // ── Select folder — load files ────────────────────────────────────────────
  const handleSelectFolder = async (folder: Folder) => {
    setSelectedFolder(folder)
    setSelectedImages(new Set())
    setActiveImage(null)
    setLoadingItems(true)
    try {
      const res  = await fetch(`/api/storage/list-files?folder=${encodeURIComponent(folder.id)}`)
      const data = await res.json()
      setFolderItems(data.files ?? [])
      setFolders((prev) => prev.map((f) =>
        f.id === folder.id ? { ...f, count: (data.files ?? []).length } : f
      ))
    } catch {
      setError('Failed to load files')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleShowAll = () => {
    setSelectedFolder(null)
    setFolderItems([])
    setSelectedImages(new Set())
    setActiveImage(null)
  }

  // ── Create folder ─────────────────────────────────────────────────────────
  const createFolder = async (name: string) => {
    const id = name.toLowerCase().replace(/\s+/g, '-')
    try {
      await fetch('/api/storage/create-folder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ folder: id }),
      })
      setFolders((prev) => [...prev, { id, name, count: 0 }])
      setShowNewFolder(false)
    } catch {
      setError('Failed to create folder')
    }
  }

  // ── Delete file ───────────────────────────────────────────────────────────
  const deleteFile = async (item: MediaItem) => {
    setConfirmDelete({
      type:  'file',
      label: item.name,
      onConfirm: async () => {
        await fetch('/api/storage/delete-file', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ folder: item.folder, fileName: item.name }),
        })
        setFolderItems((prev) => prev.filter((f) => f.id !== item.id))
        if (activeImage?.id === item.id) setActiveImage(null)
      },
    })
  }

  // ── Delete folder ─────────────────────────────────────────────────────────
  const deleteFolder = async (folder: Folder) => {
    setConfirmDelete({
      type:  'folder',
      label: folder.name,
      onConfirm: async () => {
        await fetch('/api/storage/delete-folder', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ folder: folder.id }),
        })
        setFolders((prev) => prev.filter((f) => f.id !== folder.id))
        if (selectedFolder?.id === folder.id) handleShowAll()
      },
    })
  }

  // ── Delete selection ──────────────────────────────────────────────────────
  const deleteSelection = () => {
    const count = selectedImages.size + selectedFolders.size
    setConfirmDelete({
      type:  'selection',
      label: `${count} item${count > 1 ? 's' : ''}`,
      onConfirm: async () => {
        await Promise.all([
          ...[...selectedImages].map((id) => {
            const item = folderItems.find((f) => f.id === id)
            if (!item) return Promise.resolve()
            return fetch('/api/storage/delete-file', {
              method:  'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ folder: item.folder, fileName: item.name }),
            })
          }),
          ...[...selectedFolders].map((id) => {
            return fetch('/api/storage/delete-folder', {
              method:  'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ folder: id }),
            })
          }),
        ])
        setFolderItems((prev) => prev.filter((f) => !selectedImages.has(f.id)))
        setFolders((prev) => prev.filter((f) => !selectedFolders.has(f.id)))
        setSelectedImages(new Set())
        setSelectedFolders(new Set())
        if (selectedFolder && selectedFolders.has(selectedFolder.id)) handleShowAll()
      },
    })
  }

  // ── Confirm delete handler ────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await confirmDelete.onConfirm()
    } catch {
      setError('Delete failed')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  // ── Rename file ───────────────────────────────────────────────────────────
  const handleRename = (item: MediaItem, newName: string) => {
    setFolderItems((prev) =>
      prev.map((f) =>
        f.id === item.id
          ? { ...f, name: newName, folderPath: `${item.folder}/${newName}` }
          : f
      )
    )
    setActiveImage((prev) =>
      prev?.id === item.id
        ? { ...prev, name: newName, folderPath: `${item.folder}/${newName}` }
        : prev
    )
  }

  // ── Move file ─────────────────────────────────────────────────────────────
  const handleMove = (item: MediaItem, toFolder: string) => {
    // Remove from current folder view
    setFolderItems((prev) => prev.filter((f) => f.id !== item.id))
    setActiveImage(null)

    // Update folder counts
    setFolders((prev) => prev.map((f) => {
      if (f.id === item.folder) return { ...f, count: Math.max(0, f.count - 1) }
      if (f.id === toFolder)    return { ...f, count: f.count + 1 }
      return f
    }))
  }

  // ── Selection toggles ─────────────────────────────────────────────────────
  const toggleImageSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedImages((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleFolderSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFolders((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const anySelected   = selectedImages.size > 0 || selectedFolders.size > 0
  const totalSelected = selectedImages.size + selectedFolders.size

  if (loadingPage) return <Loader />

  return (
    <div className="absolute inset-0 flex bg-gray-100 overflow-hidden">

      <FolderSidebar
        folders={folders}
        selectedFolder={selectedFolder}
        selectedFolders={selectedFolders}
        showNewFolder={showNewFolder}
        onSelectFolder={handleSelectFolder}
        onToggleFolderSelect={toggleFolderSelect}
        onShowAll={handleShowAll}
        onToggleNewFolder={() => setShowNewFolder((v) => !v)}
        onCreateFolder={createFolder}
        onCancelNewFolder={() => setShowNewFolder(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        <MediaToolbar
          selectedFolder={selectedFolder}
          viewMode={viewMode}
          totalSelected={totalSelected}
          anySelected={anySelected}
          onSetViewMode={setViewMode}
          onClearSelection={() => {
            setSelectedImages(new Set())
            setSelectedFolders(new Set())
          }}
          onUpload={() => setUploadOpen(true)}
          onDeleteSelection={deleteSelection}
        />

        {error && (
          <div className="mx-5 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden min-w-0 relative">
          {loadingItems ? (
            <Loader />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-5 min-w-0">
                {viewMode === 'grid' || !selectedFolder ? (
                  <GridView
                    folders={folders}
                    folderImages={folderItems}
                    selectedFolder={selectedFolder}
                    selectedImages={selectedImages}
                    selectedFolders={selectedFolders}
                    activeImage={activeImage}
                    onSelectFolder={handleSelectFolder}
                    onToggleFolderSelect={toggleFolderSelect}
                    onToggleImageSelect={toggleImageSelect}
                    onSetActiveImage={setActiveImage}
                    onDeleteFolder={deleteFolder}
                  />
                ) : (
                  <ListView
                    folderImages={folderItems}
                    selectedImages={selectedImages}
                    activeImage={activeImage}
                    onToggleImageSelect={toggleImageSelect}
                    onSetActiveImage={setActiveImage}
                    onDeleteFile={deleteFile}
                  />
                )}
              </div>

              {activeImage && (
                <DetailPanel
                  image={activeImage}
                  folders={folders}
                  onClose={() => setActiveImage(null)}
                  onDelete={deleteFile}
                  onRename={handleRename}
                  onMove={handleMove}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Upload dialog */}
      <UploadDialog
        open={uploadOpen}
        currentFolder={selectedFolder?.id ?? null}
        onClose={() => setUploadOpen(false)}
        onFileUploaded={(item) => {
          setFolderItems((prev) => [item, ...prev])
          setFolders((prev) => prev.map((f) =>
            f.id === item.folder ? { ...f, count: f.count + 1 } : f
          ))
        }}
      />

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Delete {confirmDelete.type === 'folder' ? 'Folder' : 'File'}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-800">{confirmDelete.label}</span>?
              {confirmDelete.type === 'folder' && (
                <span className="block mt-1 text-xs text-red-500">
                  This will delete all files inside the folder.
                </span>
              )}
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}