'use client'

/**
 * @file MediaPage.tsx
 * @description
 * The root page component for the Media Library. This is the single source
 * of truth for all media state — folders, files, selections, active item,
 * loading states, errors, and dialogs. Every child component (FolderSidebar,
 * MediaToolbar, GridView, ListView, DetailPanel, UploadDialog) receives its
 * data as props and fires callbacks back up to this component.
 *
 * ─── High-level layout ────────────────────────────────────────────────────────
 *
 *  ┌─────────────────────────────────────────────────────┐
 *  │                   MediaToolbar                      │
 *  ├──────────────┬──────────────────────────┬───────────┤
 *  │              │                          │           │
 *  │ FolderSidebar│   GridView / ListView    │Detail     │
 *  │              │                          │Panel      │
 *  │              │                          │(optional) │
 *  └──────────────┴──────────────────────────┴───────────┘
 *
 * ─── Data flow ────────────────────────────────────────────────────────────────
 *
 * 1. On mount: fetches all folders from /api/storage/list-folders.
 * 2. On folder click: fetches files from /api/storage/list-files?folder=...
 * 3. Upload, rename, move, delete: each calls its own API endpoint and then
 *    updates local state directly — no full page refresh needed.
 *
 * ─── Delete confirmation pattern ─────────────────────────────────────────────
 * Destructive actions (delete file, delete folder, delete selection) never
 * execute immediately. Instead they set the `confirmDelete` state which renders
 * a confirmation modal. Only when the user clicks "Delete" in that modal does
 * the actual API call fire via confirmDelete.onConfirm().
 *
 * ─── Selection model ──────────────────────────────────────────────────────────
 * Files and folders each have their own Set of selected ids:
 *   • selectedImages  — ids of selected MediaItems (files)
 *   • selectedFolders — ids of selected Folders
 * Both sets are cleared whenever the user navigates to a different folder.
 */

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MediaItem, Folder } from './types'
import FolderSidebar from './components/FolderSidebar'
import MediaToolbar  from './components/MediaToolbar'
import GridView      from './components/GridView'
import ListView      from './components/ListView'
import DetailPanel   from './components/DetailPanel'
import UploadDialog  from './components/UploadDialog'
import Loader        from '../Loading'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component MediaPage
 * @description
 * Orchestrates the entire Media Library feature. Manages all state and
 * coordinates data fetching, mutations, and child component communication.
 *
 * All user-facing strings are loaded from the "mediaPage" namespace in en.json.
 *
 * @returns {JSX.Element}
 */
export default function MediaPage() {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "mediaPage" namespace in en.json.
   */
  const t = useTranslations('mediaPage')

  // ─── State ──────────────────────────────────────────────────────────────────

  /**
   * `folders` — the full list of folders fetched from the API on mount.
   * Each Folder has an id (the raw folder name), a display name, and a file count.
   */
  const [folders,         setFolders]         = useState<Folder[]>([])

  /**
   * `folderItems` — the files inside the currently selected folder.
   * Reset to [] when the user navigates to "All" (no folder selected).
   */
  const [folderItems,     setFolderItems]     = useState<MediaItem[]>([])

  /**
   * `selectedFolder` — the folder the user has navigated into, or null when
   * viewing the root (all folders) level.
   */
  const [selectedFolder,  setSelectedFolder]  = useState<Folder | null>(null)

  /**
   * `viewMode` — whether the file content area renders as a card grid ('grid')
   * or a table list ('list'). Toggled by the MediaToolbar view-mode buttons.
   */
  const [viewMode,        setViewMode]        = useState<'grid' | 'list'>('grid')

  /**
   * `selectedImages` — a Set of MediaItem ids that are currently checked
   * for bulk actions (delete, move). Cleared on folder navigation.
   */
  const [selectedImages,  setSelectedImages]  = useState<Set<string>>(new Set())

  /**
   * `selectedFolders` — a Set of Folder ids that are currently checked
   * for bulk actions. Cleared on folder navigation.
   */
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set())

  /**
   * `activeImage` — the MediaItem whose details are currently shown in the
   * DetailPanel on the right. Null when no file is selected.
   */
  const [activeImage,     setActiveImage]     = useState<MediaItem | null>(null)

  /** `uploadOpen` — controls whether the UploadDialog modal is visible. */
  const [uploadOpen,      setUploadOpen]      = useState(false)

  /** `showNewFolder` — controls whether the NewFolderPopup is open in the sidebar. */
  const [showNewFolder,   setShowNewFolder]   = useState(false)

  /** `loadingPage` — true while the initial folder list is being fetched. Shows <Loader />. */
  const [loadingPage,     setLoadingPage]     = useState(true)

  /** `loadingItems` — true while files for a selected folder are being fetched. */
  const [loadingItems,    setLoadingItems]    = useState(false)

  /**
   * `confirmDelete` — when non-null, a confirmation modal is shown.
   * Holds the type of deletion ('file' | 'folder' | 'selection'), a human-readable
   * label for the modal message, and an async onConfirm callback that performs
   * the actual API call(s) when the user clicks the confirm button.
   */
  const [confirmDelete,   setConfirmDelete]   = useState<{
    type:      'file' | 'folder' | 'selection'
    label:     string
    onConfirm: () => Promise<void>
  } | null>(null)

  /**
   * `deleting` — true while the confirmDelete.onConfirm() promise is in flight.
   * Disables the modal buttons and shows a spinner on the Delete button.
   */
  const [deleting, setDeleting] = useState(false)

  /**
   * `error` — a global error message shown in a dismissible banner below the
   * toolbar. Set by any failed API call; cleared by clicking ✕.
   */
  const [error,    setError]    = useState<string | null>(null)

  // ─── Effects ─────────────────────────────────────────────────────────────────

  /**
   * Fetch all folders from the API when the page first mounts.
   *
   * Each folder from the API has a raw lowercase `name` (used as its id) and
   * a `count` of files inside it. We derive a capitalised display name from
   * the raw name for the UI.
   *
   * If the fetch fails, a translated error message is shown in the banner.
   */
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
        setError(t('errors.loadFolders'))
      } finally {
        setLoadingPage(false)
      }
    }
    load()
  }, [])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  /**
   * @function handleSelectFolder
   * Called when the user clicks a folder in FolderSidebar or GridView.
   *
   * Steps:
   *   1. Set the selected folder and clear image selection / active item.
   *   2. Show the loading spinner while files are fetched.
   *   3. Fetch the file list from the API.
   *   4. Update folderItems and also sync the folder's count badge.
   *   5. On failure, show a translated error message.
   */
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
      setError(t('errors.loadFiles'))
    } finally {
      setLoadingItems(false)
    }
  }

  /**
   * @function handleShowAll
   * Resets to the root (all folders) view.
   * Clears the selected folder, file list, image selection, and active item.
   */
  const handleShowAll = () => {
    setSelectedFolder(null)
    setFolderItems([])
    setSelectedImages(new Set())
    setActiveImage(null)
  }

  /**
   * @function createFolder
   * Creates a new folder by calling the API, then adds it to local state.
   *
   * The folder id is derived from the name: lowercased and spaces replaced
   * with hyphens (e.g. "My Photos" → "my-photos").
   *
   * @param {string} name - The display name entered by the user.
   */
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
      setError(t('errors.createFolder'))
    }
  }

  /**
   * @function deleteFile
   * Stages a single file for deletion by setting confirmDelete.
   * The actual API call is deferred until the user confirms in the modal.
   *
   * @param {MediaItem} item - The file to delete.
   */
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

  /**
   * @function deleteFolder
   * Stages a single folder for deletion by setting confirmDelete.
   * If the deleted folder is currently selected, resets to the root view.
   *
   * @param {Folder} folder - The folder to delete.
   */
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

  /**
   * @function deleteSelection
   * Stages a bulk deletion of all currently selected files and folders.
   * Fires one DELETE request per selected item in parallel via Promise.all.
   * After success, clears the selection sets and updates folder counts.
   */
  const deleteSelection = () => {
    const count = selectedImages.size + selectedFolders.size
    setConfirmDelete({
      type:  'selection',
      label: t('confirmDelete.selectionLabel', { count }),
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
          ...[...selectedFolders].map((id) =>
            fetch('/api/storage/delete-folder', {
              method:  'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ folder: id }),
            })
          ),
        ])
        setFolderItems((prev) => prev.filter((f) => !selectedImages.has(f.id)))
        setFolders((prev) => prev.filter((f) => !selectedFolders.has(f.id)))
        setSelectedImages(new Set())
        setSelectedFolders(new Set())
        if (selectedFolder && selectedFolders.has(selectedFolder.id)) handleShowAll()
      },
    })
  }

  /**
   * @function handleConfirmDelete
   * Executes the deferred delete action stored in `confirmDelete`.
   * Sets `deleting` true during the async call to show a spinner.
   * Shows a translated error banner if the call fails.
   * Always clears `confirmDelete` and resets `deleting` when done.
   */
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await confirmDelete.onConfirm()
    } catch {
      setError(t('errors.deleteFailed'))
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  /**
   * @function handleRename
   * Updates a file's name and folderPath in local state after a successful
   * rename API call (which fires inside DetailPanel).
   * Also updates activeImage if the renamed file is currently open in the panel.
   *
   * @param {MediaItem} item    - The original file item before renaming.
   * @param {string}    newName - The new filename string.
   */
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

  /**
   * @function handleMove
   * Updates local state after a file is successfully moved to another folder.
   * Removes the file from the current folder view, closes the detail panel,
   * and adjusts the file counts on both the source and destination folders.
   *
   * @param {MediaItem} item     - The file that was moved.
   * @param {string}    toFolder - The id of the destination folder.
   */
  const handleMove = (item: MediaItem, toFolder: string) => {
    setFolderItems((prev) => prev.filter((f) => f.id !== item.id))
    setActiveImage(null)
    setFolders((prev) => prev.map((f) => {
      if (f.id === item.folder) return { ...f, count: Math.max(0, f.count - 1) }
      if (f.id === toFolder)    return { ...f, count: f.count + 1 }
      return f
    }))
  }

  /**
   * @function toggleImageSelect
   * Adds or removes a file id from the selectedImages Set.
   * stopPropagation prevents the click from also opening the file's detail panel.
   *
   * @param {string}           id - The MediaItem id to toggle.
   * @param {React.MouseEvent} e  - The click event (used for stopPropagation).
   */
  const toggleImageSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedImages((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  /**
   * @function toggleFolderSelect
   * Adds or removes a folder id from the selectedFolders Set.
   * stopPropagation prevents the click from also navigating into the folder.
   *
   * @param {string}           id - The Folder id to toggle.
   * @param {React.MouseEvent} e  - The click event (used for stopPropagation).
   */
  const toggleFolderSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFolders((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Derived values ───────────────────────────────────────────────────────────

  /** True when at least one file or folder is selected (drives toolbar button visibility). */
  const anySelected   = selectedImages.size > 0 || selectedFolders.size > 0

  /** Total count of selected items (files + folders) shown in the Delete button label. */
  const totalSelected = selectedImages.size + selectedFolders.size

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loadingPage) return <Loader />

  return (
    <div className="absolute inset-0 flex bg-gray-100 overflow-hidden">

      {/* ── Folder Sidebar ── Left-hand folder navigation */}
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

      {/* ── Main content column ── Toolbar + content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Toolbar ── Breadcrumb, view toggle, bulk actions, upload */}
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

        {/* ── Global error banner ──
            Shown when any API call fails. Dismissed by clicking ✕. */}
        {error && (
          <div className="mx-5 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-600 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* ── Content area ── Grid/List + optional DetailPanel side by side */}
        <div className="flex-1 flex overflow-hidden min-w-0 relative">
          {loadingItems ? (
            <Loader />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-5 min-w-0">
                {/* Show GridView for folder browser OR when viewMode is grid.
                    Show ListView only when inside a folder AND viewMode is list. */}
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

              {/* ── Detail Panel ──
                  Slides in from the right when a file is clicked.
                  Hidden when no file is active. */}
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

      {/* ── Upload Dialog ── */}
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

      {/* ── Confirm Delete Modal ──
          Rendered over everything when a destructive action is staged.
          The modal content adapts based on confirmDelete.type:
            - 'file' or 'selection' → standard warning message
            - 'folder' → additional red note warning about contents being deleted */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">

            {/* Modal title — "Delete Folder" or "Delete File" */}
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {confirmDelete.type === 'folder'
                ? t('confirmDelete.titleFolder')
                : t('confirmDelete.titleFile')}
            </h3>

            {/* Confirmation message with the item name bolded */}
            <p className="text-sm text-gray-500 mb-5">
              {t('confirmDelete.message')}{' '}
              <span className="font-medium text-gray-800">{confirmDelete.label}</span>?
              {/* Extra warning shown only when deleting a folder */}
              {confirmDelete.type === 'folder' && (
                <span className="block mt-1 text-xs text-red-500">
                  {t('confirmDelete.folderWarning')}
                </span>
              )}
              <span className="block mt-1">{t('confirmDelete.undoWarning')}</span>
            </p>

            {/* Cancel / Delete buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition disabled:opacity-50"
              >
                {t('confirmDelete.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {/* Spinner shown while the delete API call is in flight */}
                {deleting && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {deleting ? t('confirmDelete.deleting') : t('confirmDelete.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}