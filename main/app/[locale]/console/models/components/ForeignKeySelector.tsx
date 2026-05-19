'use client'

import { useState, useRef, useEffect } from 'react'
import {
  FiSearch,
  FiX,
  FiChevronDown,
  FiLock,
  FiDatabase,
}                                      from 'react-icons/fi'
import { ON_DELETE_OPTIONS } from '../../../../api/models/uitypes'

interface FieldSummary {
  name:         string
  type:         string
  is_primary?:  boolean
  foreign_key?: any
}

interface ModelSummary {
  sm_id:  string
  name:   string
  schema: FieldSummary[]
}

type TableFilter = 'all' | 'user' | 'system'

const SYSTEM_TABLES = ['nxf_users', 'nxf_messages', 'nxf_notifications']

function isSystemModel(name: string): boolean {
  return (
    name.toLowerCase().startsWith('nxf_system_') ||
    SYSTEM_TABLES.includes(name.toLowerCase())
  )
}

function parseReference(ref: string): { table: string; column: string } | null {
  const match = ref?.match(/^(.+)\((.+)\)$/)
  if (!match) return null
  return { table: match[1], column: match[2] }
}

interface Props {
  models:         ModelSummary[]
  value:          string | undefined
  onDeleteValue:  string | undefined
  onChange:       (references: string) => void
  onDeleteChange: (onDelete: string)   => void
  onClear:        ()                   => void
}

export default function ForeignKeySelector({
  models,
  value,
  onDeleteValue,
  onChange,
  onDeleteChange,
  onClear,
}: Props) {
  const [open,        setOpen]        = useState(false)
  const [search,      setSearch]      = useState('')
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')

  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef    = useRef<HTMLInputElement>(null)

  // ── Close on outside click ──────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // ── Focus search on open ────────────────────────────────────────────────

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  // ── Derived ─────────────────────────────────────────────────────────────

  const parsed = value ? parseReference(value) : null

  const filteredModels = models.filter((m) => {
    const matchesFilter =
      tableFilter === 'all'    ? true :
      tableFilter === 'system' ? isSystemModel(m.name) :
                                 !isSystemModel(m.name)
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase().trim())
    return matchesFilter && matchesSearch
  })

  const handleSelectField = (modelName: string, fieldName: string) => {
    onChange(`${modelName}(${fieldName})`)
    setOpen(false)
    setSearch('')
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full">

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
      >
        <span className={parsed ? 'text-gray-900' : 'text-gray-400'}>
          {parsed ? (
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-purple-700">{parsed.table}</span>
              <span className="text-gray-400">→</span>
              <span className="font-mono text-gray-700">{parsed.column}</span>
            </span>
          ) : (
            'Select a field'
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {parsed && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onClear() }}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
              aria-label="clear"
            >
              <FiX size={13} />
            </span>
          )}
          <FiChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown — absolute, works now that overflow-hidden is off the card */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-[480px] flex flex-col overflow-hidden">

          {/* Search bar */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
              <FiSearch size={13} className="text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tables..."
                className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Filter toggles */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 shrink-0">
            {(['all', 'user', 'system'] as TableFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTableFilter(f)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition ${
                  tableFilter === f
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Model + field list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No results found
              </div>
            ) : (
              filteredModels.map((model) => {
                const isSystem = isSystemModel(model.name)
                return (
                  <div key={model.sm_id}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 sticky top-0">
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                        isSystem ? 'bg-gray-100' : 'bg-emerald-50'
                      }`}>
                        {isSystem
                          ? <FiLock     size={10} className="text-gray-400" />
                          : <FiDatabase size={10} className="text-emerald-500" />
                        }
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {model.name}
                      </span>
                      {isSystem && (
                        <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-gray-200 text-gray-500">
                          system
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-gray-400">
                        {model.schema.length} fields
                      </span>
                    </div>

                    {(model.schema ?? []).map((field) => {
                      const isSelected =
                        parsed?.table === model.name &&
                        parsed?.column === field.name
                      return (
                        <button
                          key={`${model.sm_id}-${field.name}`}
                          type="button"
                          onClick={() => handleSelectField(model.name, field.name)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-blue-50 transition ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="w-px h-4 bg-gray-200 shrink-0 ml-1" />
                          <span className={`text-sm font-mono flex-1 min-w-0 truncate ${
                            isSelected ? 'text-blue-700 font-semibold' : 'text-gray-700'
                          }`}>
                            {field.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">
                            {field.type}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {field.is_primary && (
                              <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-amber-50 text-amber-700">
                                PK
                              </span>
                            )}
                            {field.foreign_key && (
                              <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-purple-50 text-purple-700">
                                FK
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="text-blue-600 text-xs font-bold shrink-0">✓</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* On Delete selector */}
      {parsed && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            On Delete
          </label>
          <select
            value={onDeleteValue ?? 'CASCADE'}
            onChange={(e) => onDeleteChange(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {ON_DELETE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}