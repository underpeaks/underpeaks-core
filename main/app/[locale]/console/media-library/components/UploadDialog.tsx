'use client'

/**
 * @file UploadDialog.tsx
 * @description
 * A modal dialog for adding new media files to the Media Library.
 * It offers two methods for adding files, selectable via tabs:
 *
 * ─── Two tabs / methods ───────────────────────────────────────────────────────
 *
 * 1. UPLOAD FILE (default tab)
 *    Uses the shared <UploadZone> component which provides a drag-and-drop
 *    area and a file picker. Supports any file type up to 50 MB.
 *    On success, the uploaded file is immediately added to the media grid
 *    via onFileUploaded() and the dialog closes.
 *
 * 2. ADD VIA URL
 *    The user pastes a public URL to an existing file on the internet.
 *    Clicking "Import" calls the /api/storage/import-url endpoint which
 *    downloads the file server-side and saves it into storage.
 *    If the URL points to an image, a live preview is shown beneath the input.
 *    On success, the imported file is added to the grid and the dialog closes.
 *
 * ─── Error handling ───────────────────────────────────────────────────────────
 * Both methods surface errors inline inside the dialog (never as alerts).
 * The URL import shows the error in a red banner above the input row.
 * The UploadZone passes errors up via its onError prop, stored in the same
 * `error` state variable.
 *
 * ─── Auth ─────────────────────────────────────────────────────────────────────
 * The URL import request reads the auth token from localStorage and sends it
 * as a Bearer token in the Authorization header. This keeps the import endpoint
 * protected behind the same auth as the rest of the API.
 *
 * ─── Design note ─────────────────────────────────────────────────────────────
 * The dialog is built with Radix UI's Dialog primitives for accessibility
 * (focus trapping, Escape to close, aria roles). The overlay uses a
 * backdrop-blur so the content behind the dialog is still recognisable.
 */

import { useState } from 'react'
import { FiX, FiLink } from 'react-icons/fi'
import * as Dialog from '@radix-ui/react-dialog'
import { useTranslations } from 'next-intl'
import { UploadZone } from '@/app/lib/uploads/UploadZone'
import { UploadResult } from '@/app/lib/uploads/types'
import { MediaItem } from '../types'

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * @interface Props
 *
 * @prop {boolean}      open           - Controls whether the dialog is visible.
 *                                       Managed by the parent (MediaPage).
 * @prop {string|null}  currentFolder  - The id of the folder files will be uploaded
 *                                       into. Falls back to "uploads" if null.
 *                                       Shown in the dialog title as a breadcrumb hint.
 * @prop {Function}     onClose        - Called when the dialog should close (✕ button,
 *                                       Escape key, or clicking the overlay).
 * @prop {Function}     onFileUploaded - Called with the new MediaItem after a successful
 *                                       upload or URL import. The parent adds it to the
 *                                       media grid without requiring a full page refresh.
 */
interface Props {
  open:           boolean
  currentFolder:  string | null
  onClose:        () => void
  onFileUploaded: (item: MediaItem) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @component UploadDialog
 * @description
 * Renders a centred modal dialog with two tabs: file upload and URL import.
 * All user-facing strings are loaded from the "uploadDialog" namespace in en.json.
 *
 * @param {Props} props - See interface above.
 * @returns {JSX.Element}
 */
export default function UploadDialog({ open, currentFolder, onClose, onFileUploaded }: Props) {

  /**
   * t() is the translation function from next-intl.
   * All keys for this component live under the "uploadDialog" namespace in en.json.
   */
  const t = useTranslations('uploadDialog')

  // ─── State ──────────────────────────────────────────────────────────────────

  /**
   * `tab` — which tab is currently active: 'upload' (file picker) or 'url' (URL import).
   * Defaults to 'upload' so the most common action is immediately available.
   */
  const [tab, setTab] = useState<'upload' | 'url'>('upload')

  /**
   * `url` — the value typed into the URL import input field.
   */
  const [url, setUrl] = useState('')

  /**
   * `urlPreview` — a copy of `url` used to drive the image preview below the input.
   * If the URL does not resolve to an image, the <img> onError handler clears this,
   * hiding the preview without affecting the `url` value itself.
   */
  const [urlPreview, setUrlPreview] = useState('')

  /**
   * `importing` — true while the /api/storage/import-url fetch is in flight.
   * Disables the Import button and shows a loading label to prevent double-submits.
   */
  const [importing, setImporting] = useState(false)

  /**
   * `error` — an error message string shown in a red banner, or null when there
   * is no error. Shared by both the upload and URL import flows.
   */
  const [error, setError] = useState<string | null>(null)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  /**
   * @function handleUploaded
   * Called by <UploadZone> when a file upload completes successfully.
   *
   * Converts the raw UploadResult into the MediaItem shape expected by the
   * rest of the Media Library, then notifies the parent and closes the dialog.
   *
   * @param {UploadResult} result - The upload result returned by the UploadZone.
   */
  const handleUploaded = (result: UploadResult) => {
    onFileUploaded({
      id:         result.url,
      name:       result.name,
      url:        result.url,
      size:       `${Math.round(result.size / 1024)} KB`,
      mimeType:   result.mimeType,
      folder:     result.folder,
      folderPath: `${result.folder}/${result.name}`,
      uploaded:   new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
    })
    onClose()
  }

  /**
   * @function handleImportUrl
   * Validates the URL input and calls the server-side import endpoint.
   *
   * Steps:
   *   1. Guard: do nothing if the URL input is empty.
   *   2. Set importing=true to disable the button and show loading state.
   *   3. Read the auth token from localStorage and include it as a Bearer header.
   *   4. POST to /api/storage/import-url with the target folder and URL.
   *   5. On success: notify the parent with the returned file, reset inputs, close.
   *   6. On failure: show the error message in the red banner.
   *   7. Always reset importing=false when done (success or failure).
   */
  const handleImportUrl = async () => {
    if (!url.trim()) return
    setImporting(true)
    setError(null)
    try {
      const folder = currentFolder ?? 'uploads'
      const token  = localStorage.getItem('authToken') ?? ''

      const res = await fetch('/api/storage/import-url', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ folder, url }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('errors.importFailed'))

      onFileUploaded(data.file)
      setUrl('')
      setUrlPreview('')
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>

        {/* Semi-transparent blurred overlay behind the dialog */}
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />

        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">

          {/* Screen-reader description (visually hidden) */}
          <Dialog.Description className="sr-only">
            {t('srDescription')}
          </Dialog.Description>

          {/* ── Dialog Header ──
              Shows the title "Add Media" and, when inside a folder, the folder
              path as a monospace hint. The ✕ button closes the dialog. */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-sm font-semibold text-gray-900">
              {t('title')}
              {currentFolder && (
                <span className="ml-2 text-xs font-normal text-gray-400 font-mono">
                  → /{currentFolder}/
                </span>
              )}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <FiX size={18} />
            </button>
          </div>

          {/* ── Tabs ──
              Two tabs: "Upload File" and "Add via URL".
              The active tab gets a dark bottom border to appear selected.
              Clicking a tab updates the `tab` state which controls the panel below. */}
          <div className="flex border-b border-gray-100">
            {(['upload', 'url'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === tabKey
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tabKey === 'upload' ? t('tabs.upload') : t('tabs.url')}
              </button>
            ))}
          </div>

          {/* ── Tab Panel ── */}
          <div className="p-5">

            {tab === 'upload' ? (

              // ── Upload File tab ──────────────────────────────────────────────
              // Delegates entirely to the shared <UploadZone> component.
              // config tells it which folder to upload into, the accepted file
              // types, the max size, and a user-facing hint string.
              <UploadZone
                config={{
                  folder:    currentFolder ?? 'uploads',
                  fileType:  'any',
                  maxSizeKb: 50000,
                  hint:      t('uploadZone.hint'),
                  mode:      'storage',
                }}
                onUploaded={handleUploaded}
                onError={setError}
                onClear={() => {}}
              />

            ) : (

              // ── Add via URL tab ──────────────────────────────────────────────
              <div className="flex flex-col gap-3">

                {/* Instructional subtitle */}
                <p className="text-xs text-gray-500">{t('urlTab.description')}</p>

                {/* Error banner — shown when the import API call fails */}
                {error && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
                )}

                {/* URL input row + Import button */}
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                    <FiLink size={14} className="text-gray-400 shrink-0" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setUrlPreview(e.target.value) }}
                      placeholder={t('urlTab.placeholder')}
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleImportUrl}
                    disabled={importing || !url.trim()}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
                  >
                    {importing ? t('urlTab.importing') : t('urlTab.import')}
                  </button>
                </div>

                {/* ── Image preview ──
                    Shown when urlPreview has a value. If the URL does not point
                    to a valid image the onError handler clears urlPreview,
                    hiding this element without touching the url input value. */}
                {urlPreview && (
                  <img
                    src={urlPreview}
                    alt={t('urlTab.previewAlt')}
                    onError={() => setUrlPreview('')}
                    className="w-full h-40 object-cover rounded-md border border-gray-200 mt-1"
                  />
                )}
              </div>
            )}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}