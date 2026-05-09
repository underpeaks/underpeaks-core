'use client'

import { useState } from 'react'
import { FiX, FiLink } from 'react-icons/fi'
import * as Dialog from '@radix-ui/react-dialog'
import { UploadZone } from '@/app/lib/uploads/UploadZone'
import { UploadResult } from '@/app/lib/uploads/types'
import { MediaItem } from '../types'

interface Props {
  open:           boolean
  currentFolder:  string | null
  onClose:        () => void
  onFileUploaded: (item: MediaItem) => void
}

export default function UploadDialog({ open, currentFolder, onClose, onFileUploaded }: Props) {
  const [tab,        setTab]        = useState<'upload' | 'url'>('upload')
  const [url,        setUrl]        = useState('')
  const [urlPreview, setUrlPreview] = useState('')
  const [importing,  setImporting]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

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
      if (!res.ok) throw new Error(data.error ?? 'Import failed')

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

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
          <Dialog.Description className="sr-only">
            Upload files or import media via URL into the selected folder.
          </Dialog.Description>

          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Dialog.Title className="text-sm font-semibold text-gray-900">
              Add Media
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

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['upload', 'url'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'upload' ? 'Upload File' : 'Add via URL'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'upload' ? (
              <UploadZone
                config={{
                  folder:    currentFolder ?? 'uploads',
                  fileType:  'any',
                  maxSizeKb: 50000,
                  hint:      'Any file type — images, videos, documents',
                  mode:      'storage',
                }}
                onUploaded={handleUploaded}
                onError={setError}
                onClear={() => {}}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-500">
                  Paste a public URL to import the file directly into storage.
                </p>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-md">{error}</p>
                )}

                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
                    <FiLink size={14} className="text-gray-400 shrink-0" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setUrlPreview(e.target.value) }}
                      placeholder="https://example.com/file.jpg"
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleImportUrl}
                    disabled={importing || !url.trim()}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
                  >
                    {importing ? 'Importing…' : 'Import'}
                  </button>
                </div>

                {urlPreview && (
                  <img
                    src={urlPreview}
                    alt="preview"
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