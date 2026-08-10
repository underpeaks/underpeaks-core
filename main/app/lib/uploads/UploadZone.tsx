/**
 * UploadZone.tsx
 *
 * A fully self-contained file upload component that supports drag-and-drop,
 * click-to-browse, real-time upload progress, image previews, folder
 * selection, and both local and cloud storage modes.
 *
 * ─── What this component does ─────────────────────────────────────────────
 *
 * - Renders a drag-and-drop zone (or an uploaded file preview once a file
 *   has been successfully uploaded).
 * - Optionally renders a folder selector above the drop zone when
 *   `config.allowFolderSelect` is true. The user can pick from existing
 *   storage folders fetched from the API, or type a custom folder name.
 * - When the user drops or selects a file:
 *     1. Validates that a destination folder has been chosen.
 *     2. Shows a local image preview immediately (images only).
 *     3. Uploads the file via XMLHttpRequest so real upload progress
 *        can be tracked and displayed as a percentage.
 *     4. Calls `onUploaded` with the result on success, or `onError`
 *        with a message on failure.
 * - After a successful upload, switches to an "uploaded state" UI showing
 *   the preview, file name, folder path, and Replace / Clear buttons.
 *
 * ─── Props ────────────────────────────────────────────────────────────────
 *
 * config
 *   An UploadConfig object controlling folder, file type restrictions,
 *   size limit, labels, hints, resize instructions, and storage mode.
 *   See types.ts for the full field reference.
 *
 * initialPreview
 *   An optional URL or data URI to display as the preview before the user
 *   uploads anything. Used to show an existing value when editing a form.
 *
 * onUploaded(result)
 *   Called after a successful upload with an UploadResult object containing
 *   the file's URL, name, size, folder, and MIME type. The parent component
 *   should use this to update its own state or form field.
 *
 * onError(msg)
 *   Called when an error occurs (validation failure, network error, or
 *   a non-2xx response from the upload API). The parent component should
 *   display this message to the user.
 *
 * onClear()
 *   Called when the user clicks the clear (X) button to remove the current
 *   upload. The parent component should reset its own file-related state.
 *
 * ─── Component hierarchy ──────────────────────────────────────────────────
 *
 *   UploadZone
 *   ├── Folder selector (rendered only when config.allowFolderSelect = true)
 *   │   ├── Existing folder pills (fetched from /api/storage/list-folders)
 *   │   ├── "Custom folder" toggle button
 *   │   └── Custom folder text input
 *   ├── Label (rendered only when config.label is set)
 *   ├── [Uploaded state] — shown after a successful upload
 *   │   ├── Image preview or file icon
 *   │   ├── File name + folder path
 *   │   └── Replace button + Clear (X) button
 *   └── [Drop zone state] — shown before upload or while uploading
 *       ├── Upload icon / spinner
 *       ├── "Drag & drop or browse" text + hint
 *       ├── Progress bar (while uploading)
 *       └── Recommended spec label (when config.recommended is set)
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { FiUpload, FiX, FiFile, FiCheck } from 'react-icons/fi'
import { UploadConfig, UploadResult }  from './types'
import { getAcceptString }             from './acceptString'
import { useTranslations } from 'next-intl'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  /** Upload behaviour and display configuration. See UploadConfig in types.ts. */
  config:           UploadConfig

  /**
   * Optional URL or data URI to pre-populate the preview area.
   * Typically passed when the parent form already has a stored file URL.
   */
  initialPreview?:  string | null

  /** Called with the upload result after a successful file upload. */
  onUploaded:       (result: UploadResult) => void

  /** Called with an error message string when something goes wrong. */
  onError:          (msg: string) => void

  /** Called when the user clears the current upload. */
  onClear:          () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * UploadZone
 *
 * Renders the complete file upload UI including the drop zone, folder
 * selector, progress tracking, and post-upload preview state.
 */
export function UploadZone({ config, initialPreview, onUploaded, onError, onClear }: Props) {

  /**
   * t — Translation function scoped to the 'uploadZone' namespace.
   * Use t('key') to retrieve the translated string for that key.
   */
  const t = useTranslations('uploadZone')

  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------

  /**
   * inputRef — A ref attached to the hidden <input type="file"> element.
   * Used to programmatically open the browser's file picker when the user
   * clicks the drop zone or the "Replace" button.
   */
  const inputRef = useRef<HTMLInputElement>(null)

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Whether the user is currently dragging a file over the drop zone. */
  const [dragging,     setDragging]     = useState(false)

  /** Whether a file upload request is currently in progress. */
  const [uploading,    setUploading]    = useState(false)

  /**
   * Upload progress as a percentage (0–100).
   * Updated in real time from the XHR progress event.
   */
  const [progress,     setProgress]     = useState(0)

  /**
   * The current preview URL or data URI.
   * Set to the initialPreview prop on mount, then updated after each upload.
   * Null means no preview is currently shown.
   */
  const [preview,      setPreview]      = useState<string | null>(initialPreview ?? null)

  /**
   * The name of the most recently selected or uploaded file.
   * Displayed in the uploaded state UI. Null before any file is chosen.
   */
  const [fileName,     setFileName]     = useState<string | null>(null)

  /**
   * The list of existing storage folders fetched from the API.
   * Only populated when config.allowFolderSelect is true.
   */
  const [folders,      setFolders]      = useState<string[]>([])

  /**
   * The currently selected folder from the pill buttons.
   * Initialised from config.folder so the parent can pre-select a folder.
   */
  const [folder,       setFolder]       = useState<string>(config.folder ?? '')

  /**
   * The value typed into the custom folder input field.
   * Only used when showCustom is true.
   */
  const [customFolder, setCustomFolder] = useState('')

  /**
   * Whether the custom folder text input is currently visible.
   * Toggled by the "Custom folder…" button.
   */
  const [showCustom,   setShowCustom]   = useState(false)

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  /**
   * Sync the preview state when the parent provides or updates initialPreview.
   * This handles the case where the parent component loads its data
   * asynchronously (e.g. from a Zustand store) after the first render.
   */
  useEffect(() => {
    if (initialPreview) setPreview(initialPreview)
  }, [initialPreview])

  /**
   * Fetch existing storage folders from the API when the folder selector
   * is enabled. Populates the folder pill buttons.
   * Silently falls back to an empty list if the request fails.
   */
  useEffect(() => {
    if (!config.allowFolderSelect) return
    fetch('/api/storage/list-folders')
      .then(r  => r.json())
      .then(data => setFolders(data.folders ?? []))
      .catch(()  => setFolders([]))
  }, [config.allowFolderSelect])

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  /**
   * effectiveFolder
   * The folder that will actually be used for the upload.
   * When the custom input is visible and has a non-empty value, that takes
   * priority. Otherwise the selected pill folder is used.
   */
  const effectiveFolder = showCustom && customFolder.trim()
    ? customFolder.trim()
    : folder

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * processFile
   *
   * The core upload handler. Called whenever the user selects or drops a file.
   *
   * Steps:
   * 1. Validates that a destination folder has been selected.
   * 2. Sets the file name in state for display purposes.
   * 3. Generates a local preview data URI for image files immediately,
   *    so the user sees feedback before the upload completes.
   * 4. Builds a FormData payload and sends it via XMLHttpRequest so that
   *    real upload progress can be tracked and shown.
   * 5. On success: updates the preview with the returned URL and calls onUploaded.
   * 6. On failure: calls onError with a human-readable message.
   *
   * @param file - The File object selected by the user.
   */
  const processFile = async (file: File) => {
    if (!effectiveFolder.trim()) {
      onError(t('errors.noFolder'))
      return
    }

    setFileName(file.name)

    /**
     * Show a local preview immediately for image files using FileReader.
     * This gives instant visual feedback without waiting for the upload.
     * Non-image files (PDFs, videos, etc.) show a generic file icon instead.
     */
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setPreview(null)
    }

    setUploading(true)
    setProgress(0)

    try {
      /**
       * Build the FormData payload.
       * - file   → the binary file content.
       * - folder → the destination folder resolved above.
       * - mode   → 'local' or 'storage', from config (defaults to 'local').
       * - resize → optional JSON string of resize instructions (images only).
       *
       * Note: project_id is intentionally not sent from the client.
       * The server resolves it from the auth token in the Authorization header.
       */
      const formData = new FormData()
      formData.append('file',   file)
      formData.append('folder', effectiveFolder)
      formData.append('mode',   config.mode ?? 'local')

      if (config.resize) {
        formData.append('resize', JSON.stringify(config.resize))
      }

      /**
       * Use XMLHttpRequest instead of fetch so we can listen to the
       * `progress` event on xhr.upload and track real upload percentage.
       * The Promise wrapper lets us use async/await with XHR.
       */
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        /**
         * Track upload progress.
         * `e.lengthComputable` is false if the server doesn't send a
         * Content-Length header, in which case we skip the update.
         */
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        /**
         * Handle the response when the request completes.
         * 2xx status → parse the JSON body and resolve the promise.
         * Non-2xx   → extract the error message from the body and reject.
         */
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            try {
              const data = JSON.parse(xhr.responseText)
              reject(new Error(data.error ?? t('errors.uploadFailed')))
            } catch {
              reject(new Error(`${t('errors.uploadFailedStatus')} ${xhr.status} ${xhr.statusText}`))
            }
          }
        })

        /** Handle network-level failures (no response received at all). */
        xhr.addEventListener('error', () => reject(new Error(t('errors.networkError'))))

        xhr.open('POST', '/api/storage/upload-file')

        /**
         * Attach the auth token so the server can identify the user and
         * resolve the correct project_id without the client sending it.
         */
        const token = localStorage.getItem('authToken')
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

        xhr.send(formData)
      })

      /** Upload succeeded — update preview and notify the parent. */
      setPreview(result.url)
      setProgress(100)
      onUploaded(result)

    } catch (err: any) {
      /** Upload failed — notify parent and reset visual state. */
      onError(err.message ?? t('errors.uploadFailed'))
      setPreview(null)
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  /**
   * handleDrop
   * Called when the user drops a file onto the drop zone.
   * Prevents the browser's default behaviour (opening the file) and
   * extracts the first dropped file to pass to processFile.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  /**
   * handleChange
   * Called when the user selects a file through the hidden file input.
   * Resets the input value after reading the file so the same file
   * can be selected again if needed (browsers skip onChange otherwise).
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  /**
   * handleClear
   * Resets all upload-related state and notifies the parent via onClear.
   * Called when the user clicks the X button in the uploaded state.
   */
  const handleClear = () => {
    setPreview(null)
    setFileName(null)
    setProgress(0)
    onClear()
  }

  /**
   * isImage
   * Returns true if the given URL or data URI points to an image.
   * Used to decide whether to render an <img> preview or a file icon.
   *
   * @param src - The URL or data URI to test.
   */
  const isImage = (src: string) =>
    src.startsWith('data:image') || /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(src)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-3">

      {/* ── Folder selector ─────────────────────────────────────────────
        * Only rendered when config.allowFolderSelect is true.
        * Shown on storage management pages where the user needs to choose
        * which folder the file should be uploaded into.
        * ──────────────────────────────────────────────────────────────── */}
      {config.allowFolderSelect && (
        <div className="flex flex-col gap-2">

          {/* Section label */}
          <label className="text-xs font-semibold text-gray-700">
            {t('folderSelector.label')}
          </label>

          {/* Existing folder pills — one button per folder returned by the API */}
          {folders.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {folders.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFolder(f); setShowCustom(false) }}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    folder === f && !showCustom
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Toggle button to show/hide the custom folder input */}
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className={`w-fit px-3 py-1 rounded-full text-xs border transition ${
              showCustom
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {folders.length > 0
              ? t('folderSelector.customFolder')
              : t('folderSelector.enterFolderName')
            }
          </button>

          {/* Custom folder name text input — shown only when showCustom is true */}
          {showCustom && (
            <input
              type="text"
              value={customFolder}
              onChange={(e) => setCustomFolder(e.target.value)}
              placeholder={t('folderSelector.placeholder')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          )}

          {/* Displays the resolved destination path to reassure the user */}
          {effectiveFolder && (
            <p className="text-[11px] text-gray-400">
              {t('folderSelector.uploadingTo')}{' '}
              <span className="font-mono text-gray-600">/{effectiveFolder}/</span>
            </p>
          )}
        </div>
      )}

      {/* ── Config label ────────────────────────────────────────────────
        * Rendered only when config.label is provided.
        * Acts as the form field label for the upload input.
        * ──────────────────────────────────────────────────────────────── */}
      {config.label && (
        <label className="text-xs font-semibold text-gray-700">{config.label}</label>
      )}

      {/* ── Uploaded state ──────────────────────────────────────────────
        * Shown after a successful upload (preview is set and not uploading).
        * Displays a thumbnail or file icon, the file name, the folder path,
        * and buttons to replace or clear the current upload.
        * ──────────────────────────────────────────────────────────────── */}
      {preview && !uploading ? (
        <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">

          {/* Thumbnail for images, generic file icon for other types */}
          <div className="w-16 h-16 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {isImage(preview)
              ? <img src={preview} alt={t('preview.alt')} className="w-full h-full object-contain" />
              : <FiFile size={24} className="text-gray-400" />
            }
          </div>

          {/* File name and destination folder path */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <FiCheck size={13} className="text-green-500 shrink-0" />
              <p className="text-sm font-medium text-gray-700 truncate">
                {fileName ?? t('preview.uploaded')}
              </p>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              /{effectiveFolder}/
            </p>
          </div>

          {/* Replace and Clear action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-100 transition text-gray-600"
            >
              {t('preview.replace')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
              aria-label={t('preview.clear')}
            >
              <FiX size={14} />
            </button>
          </div>

          {/* Hidden file input triggered by the Replace button */}
          <input
            ref={inputRef}
            type="file"
            accept={getAcceptString(config.fileType)}
            className="hidden"
            onChange={handleChange}
          />
        </div>

      ) : (

        /* ── Drop zone state ──────────────────────────────────────────
          * Shown before any upload or while an upload is in progress.
          * Handles drag-and-drop and click-to-browse interactions.
          * Displays a spinner and progress bar during upload.
          * ──────────────────────────────────────────────────────────── */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg py-8 transition-colors ${
            uploading
              ? 'opacity-60 cursor-not-allowed border-gray-200'
              : dragging
                ? 'border-gray-400 bg-gray-50 cursor-copy'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          {/* Upload icon (idle) or spinner (uploading) */}
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            {uploading
              ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              : <FiUpload size={16} className="text-gray-400" />
            }
          </div>

          {/* Primary instruction text and optional hint */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">
              {uploading
                ? `${t('dropzone.uploading')} ${progress}%`
                : <>{t('dropzone.idle')} <span className="text-blue-500">{t('dropzone.browse')}</span></>
              }
            </p>
            {config.hint && (
              <p className="text-xs text-gray-400 mt-0.5">{config.hint}</p>
            )}
          </div>

          {/* Progress bar — only visible while uploading */}
          {uploading && (
            <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-800 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Recommended spec label — shown only when provided and not uploading */}
          {config.recommended && !uploading && (
            <p className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {t('dropzone.recommended')} {config.recommended}
            </p>
          )}

          {/* Hidden file input — triggered by clicking anywhere on the drop zone */}
          <input
            ref={inputRef}
            type="file"
            accept={getAcceptString(config.fileType)}
            className="hidden"
            onChange={handleChange}
          />
        </div>
      )}
    </div>
  )
}