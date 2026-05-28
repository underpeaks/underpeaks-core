'use client'

import {
  FiMenu, FiChevronRight, FiEye, FiEyeOff,
  FiEdit2, FiTrash2, FiExternalLink, FiCheck, FiX,
} from 'react-icons/fi'

import type { MenuItem, AdminPage } from './types'
import { getIcon } from '../../../components_cus/getIcon'

interface MenuRowProps {
  item:            MenuItem
  isChild:         boolean
  pages:           AdminPage[]
  onEdit:          (item: MenuItem) => void
  onDelete:        (id: string) => void
  onToggleVisible: (id: string) => void
  deletingId:      string | null
  setDeletingId:   (id: string | null) => void
  dragHandleProps: any
  t:               (key: string, values?: Record<string, any>) => string
}

export default function MenuRow({
  item, isChild, pages, onEdit, onDelete,
  onToggleVisible, deletingId, setDeletingId,
  dragHandleProps, t,
}: MenuRowProps) {
  const linkedPage = pages.find((p) => p.page_id === item.page_id)

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 bg-white hover:bg-gray-50 transition-colors ${isChild ? 'pl-10' : ''}`}>

      <div
        {...dragHandleProps}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
        title={t('row.actions.moveUp')}
      >
        <FiMenu size={14} />
      </div>

      {isChild && <FiChevronRight size={12} className="text-gray-300 shrink-0 -ml-2" />}

      <span className={`shrink-0 ${item.visible ? 'text-gray-500' : 'text-gray-300'}`}>
        {getIcon(item.icon)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${item.visible ? 'text-gray-800' : 'text-gray-400'}`}>
            {item.label}
          </p>
          {!item.visible && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
              {t('row.hidden')}
            </span>
          )}
          {item.target === '_blank' && (
            <FiExternalLink size={11} className="text-gray-400 shrink-0" />
          )}
        </div>
        {linkedPage && (
          <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
            {linkedPage.slug}
            {linkedPage.model_name && (
              <span className="ml-1 not-italic text-gray-300">· {linkedPage.model_name}</span>
            )}
          </p>
        )}
      </div>

      {linkedPage && (
        <div className="shrink-0 hidden sm:block">
          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
            {linkedPage.title}
          </span>
        </div>
      )}

      <div className="shrink-0 flex items-center gap-1">
        {deletingId === item.menu_id ? (
          <>
            <button
              onClick={() => onDelete(item.menu_id)}
              className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition"
              title={t('row.actions.confirmDelete')}
            >
              <FiCheck size={13} />
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              title={t('row.actions.cancelDelete')}
            >
              <FiX size={13} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onToggleVisible(item.menu_id)}
              className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              title={t('row.actions.toggleVisibility')}
            >
              {item.visible ? <FiEye size={13} /> : <FiEyeOff size={13} />}
            </button>
            <button
              onClick={() => onEdit(item)}
              className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              title={t('row.actions.edit')}
            >
              <FiEdit2 size={13} />
            </button>
            <button
              onClick={() => setDeletingId(item.menu_id)}
              className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition"
              title={t('row.actions.delete')}
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}