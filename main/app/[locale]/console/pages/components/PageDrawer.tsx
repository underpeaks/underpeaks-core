'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  FiX, FiLock, FiEye, FiSmartphone, FiMonitor, FiExternalLink,
} from 'react-icons/fi'
import Select from 'react-select'

import { TEMPLATE_GROUPS, TEMPLATES } from './types'
import { getTemplate }                from '@/app/[locale]/console/[slug]/components/templateRegistry'

import type { PageItem, ModelSummary, PageVisibility } from './types'


interface PageDrawerProps {
  open:     boolean
  onClose:  () => void
  onSave:   (data: Partial<PageItem>) => Promise<void>
  models:   ModelSummary[]
  initial?: PageItem | null
  saving:   boolean
}

export default function PageDrawer({
  open, onClose, onSave, models, initial, saving,
}: PageDrawerProps) {
  const t      = useTranslations('pagesPage')
  const locale = useLocale()
  const isEdit = !!initial

  const [name,       setName]       = useState('')
  const [slug,       setSlug]       = useState('')
  const [modelId,    setModelId]    = useState('')
  const [template,   setTemplate]   = useState('list')
  const [visibility, setVisibility] = useState<PageVisibility>('public')
  const [seoTitle,   setSeoTitle]   = useState('')
  const [seoDesc,    setSeoDesc]    = useState('')
  const [hidden,     setHidden]     = useState(false)

  useEffect(() => {
    if (initial) {
      const init = initial as any
      setName(initial.name ?? '')
      setSlug(initial.slug ?? '')
      // Read model_id, fall back to legacy 'model' field for old records
      setModelId(init.model_id ?? init.model ?? '')
      // Read template_type, fall back to legacy 'template' field
      setTemplate(init.template_type ?? init.template ?? 'list')
      setVisibility(initial.visibility ?? 'public')
      setSeoTitle(initial.seo_title ?? '')
      setSeoDesc(initial.seo_description ?? '')
      setHidden(initial.hidden ?? false)
    } else {
      setName('')
      setSlug('')
      setModelId('')
      setTemplate('list')
      setVisibility('public')
      setSeoTitle('')
      setSeoDesc('')
      setHidden(false)
    }
  }, [initial, open])

 const autoSlug = (n: string) =>
  n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const handleNameChange = (v: string) => {
    setName(v)
    if (!isEdit && (!slug || slug === autoSlug(name))) {
      setSlug(autoSlug(v))
    }
  }

  const canSave = name.trim() && slug.trim()

  const handleSave = async () => {
    if (!canSave) return
    await onSave({
      name: name.trim(),
      slug: slug.trim(),
      model_id: modelId || null,
      template_type: template,
      visibility,
      seo_title: seoTitle,
      seo_description: seoDesc,
      hidden,
      // Also clear legacy fields so the DB doesn't keep stale values
      model: null,
      template: null,
    } as unknown as Partial<PageItem> & { model?: null; template?: null })
  }

  const templateOptions = TEMPLATE_GROUPS.map((group) => ({
    label: group.group,
    options: group.templates.map((tmpl) => ({
      value:      tmpl.id,
      label:      tmpl.name,
      isDisabled: tmpl.locked,
      icon:       tmpl.icon,
      locked:     tmpl.locked,
    })),
  }))

  const selectedTemplate = templateOptions
    .flatMap((g) => g.options)
    .find((o) => o.value === template)

  const CustomOption = (props: any) => {
    const { data, innerRef, innerProps, isFocused } = props
    const Icon = data.icon
    return (
      <div
        ref={innerRef}
        {...innerProps}
        className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm ${
          isFocused ? 'bg-gray-100' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} />}
          <span>{data.label}</span>
        </div>
        {data.locked && <FiLock size={14} className="text-gray-400" />}
      </div>
    )
  }

  const CustomSingleValue = ({ data }: any) => {
    const Icon = data.icon
    return (
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} />}
        <span>{data.label}</span>
      </div>
    )
  }

  // ── Preview support — read from template registry ─────────────────────
  const registryEntry          = getTemplate(template)
  const supportsDesktopPreview = isEdit && Boolean(registryEntry?.fullScreenPreview) && Boolean(slug)
  const supportsMobilePreview  = isEdit && Boolean(registryEntry?.mobilePreview)     && Boolean(slug)
  const supportsAnyPreview     = supportsDesktopPreview || supportsMobilePreview

  // Strip leading slash for preview URLs since the route already includes it
  const previewSlug = (slug ?? '').replace(/^\//, '')

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      <div className="fixed top-16 right-0 bottom-0 w-full max-w-md bg-white
                      border-l border-gray-200 z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {isEdit ? t('drawer.editTitle') : t('drawer.title')}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{t('drawer.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Basic Info */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.basicInfo')}
            </p>
            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.name.label')}
                  <span className="text-red-400"> *</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t('drawer.fields.name.placeholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.slug.label')}
                  <span className="text-red-400"> *</span>
                </label>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t('drawer.fields.slug.placeholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition font-mono"
                />
                <p className="text-[11px] text-gray-400">{t('drawer.fields.slug.hint')}</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.visibility.label')}
                </label>
                <div className="flex gap-2">
                  {(['public', 'admin', 'draft'] as PageVisibility[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVisibility(v)}
                      className={`flex-1 py-2 text-xs font-medium rounded-md border transition capitalize ${
                        visibility === v
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t(`visibility.${v}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-gray-50
                              border border-gray-200 rounded-md">
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    {t('drawer.fields.hidden.label')}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {t('drawer.fields.hidden.hint')}
                  </p>
                </div>
                <button
                  onClick={() => setHidden(!hidden)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    hidden ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full
                                shadow transition-transform ${
                      hidden ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Model & Template */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.modelTemplate')}
            </p>

            <div className="flex flex-col gap-3">

              {/* MODEL */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.model.label')}
                </label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                >
                  <option value="">{t('drawer.fields.model.noModel')}</option>
                  {models.map((m) => (
                    <option key={m.sm_id} value={m.sm_id}>{m.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400">{t('drawer.fields.model.hint')}</p>
              </div>

              {/* TEMPLATE */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.template.label')}
                </label>
                <Select
                  options={templateOptions}
                  value={selectedTemplate}
                  onChange={(option: any) => setTemplate(option.value)}
                  isSearchable
                  components={{ Option: CustomOption, SingleValue: CustomSingleValue }}
                  className="text-sm"
                  placeholder="Select template..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight:   35,
                      borderRadius: 6,
                      borderColor: '#e5e7eb',
                      boxShadow:   'none',
                    }),
                  }}
                />
                {TEMPLATES.find((t) => t.id === template)?.locked && (
                  <p className="text-[11px] text-amber-500">
                    This template is available on the hosted plan.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ── PREVIEW SECTION ───────────────────────────────────────────── */}
          {supportsAnyPreview && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Preview
              </p>

              <p className="text-[11px] text-gray-500 mb-3">
                Preview how this page will render. Opens in a new tab so you don't lose
                your changes.
              </p>

              <div className="grid grid-cols-2 gap-2">
                {supportsDesktopPreview && (
                  <a
                    href={`/${locale}/preview/${previewSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2.5
                               text-xs font-medium rounded-md border border-gray-200
                               text-gray-700 hover:bg-gray-50 transition group"
                  >
                    <FiMonitor size={14} className="text-[var(--color-primary)]" />
                    Desktop
                    <FiExternalLink size={11} className="text-gray-300 group-hover:text-gray-500" />
                  </a>
                )}

                {supportsMobilePreview && (
                  <a
                    href={`/${locale}/preview/mobile/${previewSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2.5
                               text-xs font-medium rounded-md border border-gray-200
                               text-gray-700 hover:bg-gray-50 transition group"
                  >
                    <FiSmartphone size={14} className="text-[var(--color-primary)]" />
                    Mobile
                    <FiExternalLink size={11} className="text-gray-300 group-hover:text-gray-500" />
                  </a>
                )}
              </div>

              {/* In-console "view live" link for data templates */}
              {registryEntry?.category === 'data' && (
                <a
                  href={`/${locale}/console${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-2 px-3 py-2
                             text-[11px] font-medium rounded-md
                             text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition"
                >
                  <FiEye size={12} />
                  Open page in console
                  <FiExternalLink size={10} />
                </a>
              )}
            </section>
          )}

          {/* Hint shown when editing but template doesn't support preview */}
          {isEdit && !supportsAnyPreview && registryEntry?.category !== 'data' && (
            <section>
              <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-[11px] text-gray-500">
                  Preview not available for this template type.
                </p>
              </div>
            </section>
          )}

          {/* Hint shown when creating a new page */}
          {!isEdit && (
            <section>
              <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-[11px] text-blue-600">
                  Save this page first to enable preview.
                </p>
              </div>
            </section>
          )}

          {/* SEO */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
              {t('drawer.sections.seo')}
            </p>

            <div className="flex flex-col gap-3">

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.seoTitle.label')}
                </label>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={t('drawer.fields.seoTitle.placeholder')}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
                />
                <p className="text-[11px] text-gray-400">
                  {t('drawer.fields.seoTitle.charCount', { count: seoTitle.length })}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">
                  {t('drawer.fields.seoDesc.label')}
                </label>
                <textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  placeholder={t('drawer.fields.seoDesc.placeholder')}
                  rows={3}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50
                             focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white
                             transition resize-none"
                />
                <p className="text-[11px] text-gray-400">
                  {t('drawer.fields.seoDesc.charCount', { count: seoDesc.length })}
                </p>
              </div>

              {(seoTitle || seoDesc || slug) && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">
                    {t('drawer.seoPreview.label')}
                  </p>
                  <p className="text-sm text-blue-600 font-medium truncate">
                    {seoTitle || name || t('drawer.seoPreview.titleFallback')}
                  </p>
                 <p className="text-[11px] text-green-700 truncate">
  {t('drawer.seoPreview.urlPrefix')}/{slug || 'slug'}
</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {seoDesc || t('drawer.seoPreview.descFallback')}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700
                       text-sm font-medium rounded-md hover:bg-gray-50 transition"
          >
            {t('drawer.actions.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md
                       hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving
              ? t('drawer.actions.saving')
              : isEdit
                ? t('drawer.actions.update')
                : t('drawer.actions.create')}
          </button>
        </div>
      </div>
    </>
  )
}