'use client'

import { useTranslations } from 'next-intl'
import { FiSearch, FiPlus } from 'react-icons/fi'
import type { PageVisibility } from './types'

interface PagesToolbarProps {
  pageCount: number
  search:    string
  filterVis: PageVisibility | 'all'
  onSearch:  (v: string) => void
  onFilter:  (v: PageVisibility | 'all') => void
  onNewPage: () => void
}

const VISIBILITY_FILTERS = ['all', 'public', 'admin', 'draft'] as const

export default function PagesToolbar({
  pageCount, search, filterVis, onSearch, onFilter, onNewPage,
}: PagesToolbarProps) {
  const t = useTranslations('pagesPage')

  return (
    <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-base font-bold text-gray-900">{t('toolbar.title')}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{t('toolbar.pageCount', { count: pageCount })}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 w-56">
          <FiSearch size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('toolbar.searchPlaceholder')}
            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white text-xs font-medium">
          {VISIBILITY_FILTERS.map((v) => (
            <button
              key={v}
              onClick={() => onFilter(v)}
              className={`px-3 py-2 capitalize transition-colors border-r border-gray-200 last:border-0 ${
                filterVis === v ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {v === 'all' ? t('filter.all') : t(`visibility.${v}`)}
            </button>
          ))}
        </div>

        <button
          onClick={onNewPage}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition"
        >
          <FiPlus size={15} />
          {t('toolbar.newPage')}
        </button>
      </div>
    </div>
  )
}