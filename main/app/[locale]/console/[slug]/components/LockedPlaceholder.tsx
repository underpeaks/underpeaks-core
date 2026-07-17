'use client'

/**
 * LockedPlaceholder.tsx
 * Location: app/[locale]/console/[slug]/components/LockedPlaceholder.tsx
 *
 * Rendered in place of a locked template when running on self-hosted.
 * Shows the template name and a CTA to upgrade.
 */

import { FiLock, FiExternalLink } from 'react-icons/fi'
import { useTranslations }        from 'next-intl'
import type { ClientTemplateProps } from '../types'

interface LockedPlaceholderProps extends Partial<ClientTemplateProps> {
  templateName: string
}

export default function LockedPlaceholder({ templateName, page }: LockedPlaceholderProps) {
  const t = useTranslations('lockedTemplate')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
        <FiLock size={28} className="text-amber-600" />
      </div>

      <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">
        {t('title')}
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] max-w-md mb-5">
        {t('description', { templateName })}
      </p>

      <a
        href="https://underpeaks.com/pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg
                   bg-[var(--color-primary)] text-white hover:opacity-90 transition"
      >
        {t('upgradeButton')} <FiExternalLink size={13} />
      </a>

      {page && (
        <p className="text-xs text-gray-400 mt-6 font-mono">
          Template ID: {page.template_type}
        </p>
      )}
    </div>
  )
}