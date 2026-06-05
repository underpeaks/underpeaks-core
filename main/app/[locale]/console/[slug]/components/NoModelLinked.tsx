'use client'

/**
 * NoModelLinked.tsx
 * Location: app/[locale]/console/[slug]/components/NoModelLinked.tsx
 *
 * Rendered when a data template (list, grid, etc) has no model attached.
 * Used by the admin dynamic page router.
 */

import Link                from 'next/link'
import { useTranslations } from 'next-intl'
import { FiAlertTriangle } from 'react-icons/fi'

interface NoModelLinkedProps {
  locale:       string
  templateName: string
  pageName:     string
}

export default function NoModelLinked({
  locale, templateName, pageName,
}: NoModelLinkedProps) {
  const t = useTranslations('noModelLinked')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
        <FiAlertTriangle size={28} className="text-amber-600" />
      </div>

      <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">
        {t('title')}
      </h1>

      <p className="text-sm text-[var(--color-text-muted)] mb-1 max-w-md">
        {t('description', { pageName, templateName })}
      </p>

      <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-md">
        {t('instruction')}
      </p>

      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/console/pages`}
          className="px-4 py-2 text-sm font-medium rounded-lg
                     bg-[var(--color-primary)] text-white hover:opacity-90 transition"
        >
          {t('openPages')}
        </Link>

        <Link
          href={`/${locale}/console/models`}
          className="px-4 py-2 text-sm font-medium rounded-lg
                     border border-gray-200 text-[var(--color-text)] hover:bg-gray-50 transition"
        >
          {t('manageModels')}
        </Link>
      </div>
    </div>
  )
}