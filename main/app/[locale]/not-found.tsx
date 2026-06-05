/**
 * Locale-aware 404 page
 * Location: app/[locale]/not-found.tsx
 *
 * Renders when a notFound() is called from any route inside [locale].
 * Uses translations so the page is consistent with the rest of the app.
 *
 * If a 404 happens OUTSIDE the [locale] segment, app/not-found.tsx is
 * used instead.
 */

import Link                              from 'next/link'
import { useTranslations, useLocale }    from 'next-intl'
import { FiHome, FiArrowLeft, FiSearch } from 'react-icons/fi'

export default function LocaleNotFound() {
  const t      = useTranslations('notFound')
  const locale = useLocale()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center">

        <div className="relative mb-6">
          <p className="text-[120px] font-black text-[var(--color-primary)]/10 leading-none select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)]/10
                            flex items-center justify-center">
              <FiSearch size={32} className="text-[var(--color-primary)]" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
          {t('title')}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          {t('description')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium
                       rounded-lg bg-[var(--color-primary)] text-white
                       hover:opacity-90 transition w-full sm:w-auto justify-center"
          >
            <FiHome size={14} />
            {t('goHome')}
          </Link>

          <Link
            href={`/${locale}/console`}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium
                       rounded-lg border border-gray-200 text-[var(--color-text)]
                       hover:bg-gray-50 transition w-full sm:w-auto justify-center"
          >
            <FiArrowLeft size={14} />
            {t('backToConsole')}
          </Link>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400 mb-3">{t('helpfulLinks')}</p>
          <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
            <Link href={`/${locale}/console/pages`} className="text-[var(--color-primary)] hover:underline">
              {t('pages')}
            </Link>
            <span className="text-gray-300">·</span>
            <Link href={`/${locale}/console/models`} className="text-[var(--color-primary)] hover:underline">
              {t('models')}
            </Link>
            <span className="text-gray-300">·</span>
            <Link href={`/${locale}/console/users`} className="text-[var(--color-primary)] hover:underline">
              {t('users')}
            </Link>
            <span className="text-gray-300">·</span>
            <Link href={`/${locale}/console/settings`} className="text-[var(--color-primary)] hover:underline">
              {t('settings')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}