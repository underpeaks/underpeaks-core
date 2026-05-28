'use client'

import { useTranslations } from 'next-intl'
import { FiGlobe, FiLock, FiEyeOff } from 'react-icons/fi'
import type { PageVisibility } from './types'

const BADGE_MAP: Record<PageVisibility, { labelKey: string; className: string; icon: React.ReactNode }> = {
  public: { labelKey: 'visibility.public', className: 'bg-green-50 text-green-600 border-green-200', icon: <FiGlobe  size={10} /> },
  admin:  { labelKey: 'visibility.admin',  className: 'bg-amber-50 text-amber-600 border-amber-200', icon: <FiLock   size={10} /> },
  draft:  { labelKey: 'visibility.draft',  className: 'bg-gray-100 text-gray-500 border-gray-200',   icon: <FiEyeOff size={10} /> },
}

export default function VisibilityBadge({ visibility }: { visibility: PageVisibility }) {
  const t = useTranslations('pagesPage')
  const { labelKey, className, icon } = BADGE_MAP[visibility] ?? BADGE_MAP['draft']

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${className}`}>
      {icon}{t(labelKey)}
    </span>
  )
}