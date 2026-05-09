'use client'

import { useState, useRef, useEffect } from 'react'
import { FiUpload, FiX, FiFile, FiCheck } from 'react-icons/fi'
import { UploadConfig, UploadResult } from './types'
import { getAcceptString } from './acceptString'

interface Props {
  config:          UploadConfig
  initialPreview?: string | null
  onUploaded:      (result: UploadResult) => void
  onError:         (msg: string) => void
  onClear:         () => void
}

export function UploadZone({ config, initialPreview, onUploaded, onError, onClear }: Props) {
  const inputRef                        = useRef<HTMLInputElement>(null)
  const [dragging,     setDragging]     = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [progress,     setProgress]     = useState(0)
  const [preview,      setPreview]      = useState<string | null>(initialPreview ?? null)
  const [fileName,     setFileName]     = useState<string | null>(null)
  const [folders,      setFolders]      = useState<string[]>([])
  const [folder,       setFolder]       = useState<string>(config.folder ?? '')
  const [customFolder, setCustomFolder] = useState('')
  const [showCustom,   setShowCustom]   = useState(false)

  // Sync when parent hydrates initialPreview (e.g. after store loads)
  useEffect(() => {
    if (initialPreview) setPreview(initialPreview)
  }, [initialPreview])

  // Fetch existing folders from storage when folder selector is enabled
  useEffect(() => {
    if (!config.allowFolderSelect) return
    fetch('/api/storage/list-folders')
      .then(r => r.json())
      .then(data => setFolders(data.folders ?? []))
      .catch(() => setFolders([]))
  }, [config.allowFolderSelect])

  const effectiveFolder = showCustom && customFolder.trim()
    ? customFolder.trim()
    : folder

  const processFile = async (file: File) => {
    if (!effectiveFolder.trim()) {
      onError('Please select or enter a folder before uploading.')
      return
    }

    setFileName(file.name)

    // Show local preview immediately for images
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
      const formData = new FormData()
      formData.append('file',   file)
      formData.append('folder', effectiveFolder)
      formData.append('mode',   config.mode ?? 'local')
      // project_id resolved server-side from auth token — not sent from client

      if (config.resize) {
        formData.append('resize', JSON.stringify(config.resize))
      }

      // XMLHttpRequest for real progress tracking
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            try {
              const data = JSON.parse(xhr.responseText)
              reject(new Error(data.error ?? 'Upload failed'))
            } catch {
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
            }
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error')))

        xhr.open('POST', '/api/storage/upload-file')

        // ── Send auth token so server can resolve project_id ──────────
        const token = localStorage.getItem('authToken')
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

        xhr.send(formData)
      })

      setPreview(result.url)
      setProgress(100)
      onUploaded(result)
    } catch (err: any) {
      onError(err.message ?? 'Upload failed')
      setPreview(null)
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleClear = () => {
    setPreview(null)
    setFileName(null)
    setProgress(0)
    onClear()
  }

  const isImage = (src: string) =>
    src.startsWith('data:image') || /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(src)

  return (
    <div className="flex flex-col gap-3">

      {/* ── Folder selector (storage page only) ───────────────────────── */}
      {config.allowFolderSelect && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-700">Upload Folder</label>

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

          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className={`w-fit px-3 py-1 rounded-full text-xs border transition ${
              showCustom
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {folders.length > 0 ? 'Custom folder…' : 'Enter folder name'}
          </button>

          {showCustom && (
            <input
              type="text"
              value={customFolder}
              onChange={(e) => setCustomFolder(e.target.value)}
              placeholder="e.g. banners/summer"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          )}

          {effectiveFolder && (
            <p className="text-[11px] text-gray-400">
              Uploading to:{' '}
              <span className="font-mono text-gray-600">/{effectiveFolder}/</span>
            </p>
          )}
        </div>
      )}

      {/* ── Label ─────────────────────────────────────────────────────── */}
      {config.label && (
        <label className="text-xs font-semibold text-gray-700">{config.label}</label>
      )}

      {/* ── Uploaded state ─────────────────────────────────────────────── */}
      {preview && !uploading ? (
        <div className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-16 h-16 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {isImage(preview)
              ? <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              : <FiFile size={24} className="text-gray-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <FiCheck size={13} className="text-green-500 shrink-0" />
              <p className="text-sm font-medium text-gray-700 truncate">
                {fileName ?? 'Uploaded'}
              </p>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              /{effectiveFolder}/
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-100 transition text-gray-600"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            >
              <FiX size={14} />
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={getAcceptString(config.fileType)}
            className="hidden"
            onChange={handleChange}
          />
        </div>
      ) : (
        /* ── Drop zone ──────────────────────────────────────────────── */
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
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            {uploading
              ? <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              : <FiUpload size={16} className="text-gray-400" />
            }
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">
              {uploading
                ? `Uploading… ${progress}%`
                : <> Drag & drop or <span className="text-blue-500">browse</span> </>
              }
            </p>
            {config.hint && (
              <p className="text-xs text-gray-400 mt-0.5">{config.hint}</p>
            )}
          </div>

          {uploading && (
            <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-800 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {config.recommended && !uploading && (
            <p className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              Recommended: {config.recommended}
            </p>
          )}

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