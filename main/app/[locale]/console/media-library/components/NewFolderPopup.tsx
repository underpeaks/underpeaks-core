'use client'

import { useState, useRef, useEffect } from 'react'

interface NewFolderPopupProps {
  onConfirm: (name: string) => void
  onCancel:  () => void
}

export default function NewFolderPopup({ onConfirm, onCancel }: NewFolderPopupProps) {
  const [value,  setValue]  = useState('')
  const inputRef            = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed) { onConfirm(trimmed); setValue('') }
  }

  return (
    <div className="mx-3 mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col gap-2 shadow-sm">
      <p className="text-xs font-semibold text-gray-700">New Folder</p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  submit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Folder name"
        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex-1 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Create
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-100 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}