'use client'

import { useTranslations } from 'next-intl'
import {
  FiEdit2, FiTrash2, FiChevronRight,
  FiLock, FiEyeOff, FiShield, FiCheck, FiX,
} from 'react-icons/fi'
import VisibilityBadge from './VisibilityBadge'
import { TEMPLATES } from './types'
import type { PageItem, ModelSummary } from './types'

interface PageRowProps {
  page:           PageItem
  models:         ModelSummary[]
  deletingId:     string | null
  onEdit:         (page: PageItem) => void
  onDelete:       (pageId: string) => void
  onDeleteReq:    (pageId: string) => void
  onDeleteCancel: () => void
}

export default function PageRow({
  page, models, deletingId,
  onEdit, onDelete, onDeleteReq, onDeleteCancel,
}: PageRowProps) {
  const t        = useTranslations('pagesPage')
  const isSystem = !!page.is_system

  const modelName    = (id: string | null) => models.find((m) => m.sm_id === id || m.name === id)?.name ?? '—'
  const templateName = (id: string) => TEMPLATES.find((tmpl) => tmpl.id === id)?.name ?? id

  return (
    <div className={`group grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 items-center px-5 py-3.5 border-b border-gray-100 last:border-0 transition-colors ${
      isSystem ? 'bg-gray-50/60' : 'hover:bg-gray-50'
    }`}>

      {/* Name + slug */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate">{page.name ?? '—'}</p>
          {isSystem && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-500 uppercase tracking-wide shrink-0">
              <FiShield size={8} /> {t('table.systemBadge')}
            </span>
          )}
          {page.hidden && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-100 text-yellow-600 uppercase tracking-wide shrink-0">
              <FiEyeOff size={8} /> {t('table.hiddenBadge')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{page.slug ?? '—'}</p>
        {page.seo_title && (
          <p className="text-[10px] text-gray-400 truncate mt-0.5">
            {t('table.seoPrefix')}: {page.seo_title}
          </p>
        )}
      </div>

      {/* Model */}
      <div>
        {page.model
          ? <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{modelName(page.model)}</span>
          : <span className="text-xs text-gray-400">—</span>
        }
      </div>

      {/* Template */}
      <div>
        <span className="text-xs text-gray-600">{templateName(page.template ?? '')}</span>
      </div>

      {/* Visibility */}
      <div>
        <VisibilityBadge visibility={page.visibility ?? 'draft'} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {isSystem ? (
          <div className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-300" title={t('actions.systemLocked')}>
            <FiLock size={12} />
          </div>
        ) : deletingId === page.page_id ? (
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(page.page_id)} className="flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 transition" title={t('actions.confirmDelete')}>
              <FiCheck size={13} />
            </button>
            <button onClick={onDeleteCancel} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title={t('actions.cancel')}>
              <FiX size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(page)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title={t('actions.edit')}>
              <FiEdit2 size={13} />
            </button>
            <button onClick={() => onDeleteReq(page.page_id)} className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition" title={t('actions.delete')}>
              <FiTrash2 size={13} />
            </button>
            <button className="flex items-center justify-center w-7 h-7 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition" title={t('actions.view')}>
              <FiChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}