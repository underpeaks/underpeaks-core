'use client'

import { useState, useEffect } from 'react'
import {
  FiX, FiEye, FiEyeOff, FiExternalLink,
  FiHome, FiGrid, FiPackage, FiUsers, FiSettings,
  FiFileText, FiShoppingCart, FiMail, FiStar, FiInfo,
} from 'react-icons/fi'

import { ICON_OPTIONS } from './types'
import type { MenuItem, AdminPage, MenuTarget } from './types'
import { getIcon } from '../../../components_cus/getIcon'

interface MenuItemDrawerProps {
  open:          boolean
  onClose:       () => void
  onSave:        (data: Partial<MenuItem> & { page_id: string }) => Promise<void>
  existing?:     MenuItem | null
  parentOptions: MenuItem[]
  pages:         AdminPage[]
  saving:        boolean
  t:             (key: string, values?: Record<string, any>) => string
}

const iconComponents: Record<string, React.ReactNode> = {
  FiHome:         <FiHome size={14} />,
  FiGrid:         <FiGrid size={14} />,
  FiPackage:      <FiPackage size={14} />,
  FiUsers:        <FiUsers size={14} />,
  FiSettings:     <FiSettings size={14} />,
  FiFileText:     <FiFileText size={14} />,
  FiShoppingCart: <FiShoppingCart size={14} />,
  FiMail:         <FiMail size={14} />,
  FiStar:         <FiStar size={14} />,
  FiInfo:         <FiInfo size={14} />,
}

export default function MenuItemDrawer({
  open, onClose, onSave, existing, parentOptions, pages, saving, t,
}: MenuItemDrawerProps) {
  const [label,    setLabel]    = useState('')
  const [pageId,   setPageId]   = useState('')
  const [icon,     setIcon]     = useState('FiFileText')
  const [target,   setTarget]   = useState<MenuTarget>('_self')
  const [visible,  setVisible]  = useState(true)
  const [parentId, setParentId] = useState('')

  useEffect(() => {
    if (existing) {
      setLabel(existing.label ?? '')
      setPageId(existing.page_id ?? '')
      setIcon(existing.icon ?? 'FiFileText')
      setTarget(existing.target ?? '_self')
      setVisible(existing.visible ?? true)
      setParentId(existing.parent_id ?? '')
    } else {
      setLabel('')
      setPageId('')
      setIcon('FiFileText')
      setTarget('_self')
      setVisible(true)
      setParentId('')
    }
  }, [existing, open])

  const selectedPage = pages.find((p) => p.page_id === pageId)

  // Both label and a page selection are required
  const canSave = !!(label.trim() && pageId)

  const handleSave = async () => {
    if (!canSave) return
    if (!pageId)  return // belt and braces

    await onSave({
      label:     label.trim(),
      page_id:   pageId,
      icon,
      target,
      visible,
      parent_id: parentId || null,
    })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-16 right-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {existing ? t('drawer.titleEdit') : t('drawer.titleAdd')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('drawer.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Label & Visibility */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.labelVisibility')}
            </p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.menuLabel')} <span className="text-red-400">*</span>
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t('drawer.fields.menuLabelPlaceholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
                <p className="text-[11px] text-gray-400">{t('drawer.fields.menuLabelHint')}</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.visibility')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setVisible(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                      visible
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <FiEye size={12} /> {t('drawer.fields.visible')}
                  </button>
                  <button
                    onClick={() => setVisible(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md border transition ${
                      !visible
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <FiEyeOff size={12} /> {t('drawer.fields.hidden')}
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Page link */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.link')}
            </p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.selectPage')} <span className="text-red-400">*</span>
                </label>
                <select
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  className={`px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${
                    !pageId ? 'border-red-200' : 'border-gray-200'
                  }`}
                >
                  <option value="">{t('drawer.fields.selectPagePlaceholder')}</option>
                  {pages.map((p) => (
                    <option key={p.page_id} value={p.page_id}>
                      {p.title}{p.model_name ? ` (${p.model_name})` : ''} — {p.slug}
                    </option>
                  ))}
                </select>

                {/* No pages exist at all */}
                {pages.length === 0 && (
                  <p className="text-[11px] text-amber-500">
                    {t('drawer.fields.noPagesHint')}
                  </p>
                )}

                {/* Pages exist but none selected yet */}
                {pages.length > 0 && !pageId && (
                  <p className="text-[11px] text-red-400">
                    {t('drawer.fields.pageRequired')}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.openIn')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTarget('_self')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition ${
                      target === '_self'
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t('drawer.fields.sameTab')}
                  </button>
                  <button
                    onClick={() => setTarget('_blank')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md border transition ${
                      target === '_blank'
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t('drawer.fields.newTab')}
                  </button>
                </div>
              </div>

            </div>
          </section>

          {/* Icon picker */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.icon')}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setIcon(opt.id)}
                  title={t(`drawer.icons.${opt.labelKey}`)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-md border text-[10px] transition ${
                    icon === opt.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {iconComponents[opt.id]}
                  <span>{t(`drawer.icons.${opt.labelKey}`)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Nesting */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.nesting')}
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">
                {t('drawer.fields.parentItem')}
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
              >
                <option value="">{t('drawer.fields.parentItemPlaceholder')}</option>
                {parentOptions
                  .filter((p) => p.menu_id !== existing?.menu_id)
                  .map((p) => (
                    <option key={p.menu_id} value={p.menu_id}>{p.label}</option>
                  ))}
              </select>
              <p className="text-[11px] text-gray-400">{t('drawer.fields.parentItemHint')}</p>
            </div>
          </section>

          {/* Live preview — only shown when label is set */}
          {label && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                {t('drawer.sections.preview')}
              </p>
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-md">
                <span className="text-gray-500">{getIcon(icon)}</span>
                <span className="text-sm font-medium text-gray-800">{label}</span>
                {!visible && (
                  <span className="text-[10px] text-gray-400 ml-auto">
                    ({t('drawer.preview.hidden')})
                  </span>
                )}
                {target === '_blank' && (
                  <FiExternalLink size={11} className="text-gray-400 ml-auto" />
                )}
                {selectedPage && (
                  <span className="text-[10px] text-gray-400 font-mono truncate ml-auto">
                    {selectedPage.slug}
                  </span>
                )}
              </div>

              {/* Summary of what will be saved */}
              {!pageId && (
                <p className="text-[11px] text-red-400 mt-2 text-center">
                  {t('drawer.fields.pageRequired')}
                </p>
              )}
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition"
          >
            {t('drawer.buttons.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving
              ? t('drawer.buttons.saving')
              : existing
                ? t('drawer.buttons.saveChanges')
                : t('drawer.buttons.addItem')
            }
          </button>
        </div>

      </div>
    </>
  )
}