'use client'

import { useState, useRef } from 'react'
import { useLocale } from 'next-intl'
import { usePathname } from 'next/navigation'
import { locales, localeNames, localeFlagCodes, type Locale } from '@/i18n/request'

export default function LocaleSwitcher() {
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  function handleChange(newLocale: Locale) {
    const segments = pathname.split('/')
    const isLocaleSegment = locales.includes(segments[1] as Locale)
    const pathWithoutLocale = isLocaleSegment
      ? '/' + segments.slice(2).join('/')
      : pathname

    const newPath =
      newLocale === 'en'
        ? pathWithoutLocale || '/'
        : `/${newLocale}${pathWithoutLocale}`

    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    setOpen(false)
    window.location.href = newPath
  }

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className={`fi fi-${localeFlagCodes[locale]} rounded-sm`} />
        <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-300">
          {locale}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => handleChange(l)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                l === locale
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className={`fi fi-${localeFlagCodes[l]} rounded-sm`} />
              {localeNames[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}