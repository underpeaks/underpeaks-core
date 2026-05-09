import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = [
  'en', 'fr','af' ,'de', 'es', 'pt', 'it', 'nl', 'pl',
  'ja', 'zh', 'ko', 'ar', 'ru', 'tr', 'sv', 'da'
] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English', fr: 'Français',af: 'Afrikaans' ,de: 'Deutsch',
  es: 'Español', pt: 'Português', it: 'Italiano',
  nl: 'Nederlands', pl: 'Polski', ja: '日本語',
  zh: '中文', ko: '한국어', ar: 'العربية',
  ru: 'Русский', tr: 'Türkçe', sv: 'Svenska', da: 'Dansk',
}

export const localeFlagCodes: Record<Locale, string> = {
  en: 'gb', fr: 'fr',af: 'za' , de: 'de', es: 'es', pt: 'pt',
  it: 'it', nl: 'nl', pl: 'pl', ja: 'jp', zh: 'cn',
  ko: 'kr', ar: 'sa', ru: 'ru', tr: 'tr', sv: 'se', da: 'dk',
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale
  if (!locale || !locales.includes(locale as Locale)) notFound()
  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  }
})