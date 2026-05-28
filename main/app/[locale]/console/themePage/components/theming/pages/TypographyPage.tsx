'use client'

import { useState }        from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from '../../../ThemeContext'

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat',
  'Raleway', 'Nunito', 'Source Sans 3', 'Ubuntu', 'Merriweather',
  'Playfair Display', 'Lora', 'PT Serif', 'Crimson Text',
  'Space Grotesk', 'DM Sans', 'Outfit', 'Sora', 'Figtree',
]

const MONO_FONTS = [
  'JetBrains Mono', 'Fira Code', 'Source Code Pro',
  'IBM Plex Mono', 'Roboto Mono', 'Space Mono',
]

const WEIGHTS = ['300', '400', '500', '600', '700', '800']

const SCALES = [
  { id: 'compact', label: 'Compact', desc: 'Smaller text, tighter spacing'   },
  { id: 'default', label: 'Default', desc: 'Balanced for most apps'          },
  { id: 'relaxed', label: 'Relaxed', desc: 'Larger text, more breathing room'},
]

function FontPreview({ font, weight, text }: { font: string; weight: string; text: string }) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@${weight}&display=swap`
  return (
    <>
      <link rel="stylesheet" href={url} />
      <p
        style={{ fontFamily: `'${font}', sans-serif`, fontWeight: weight }}
        className="text-base text-gray-800 mt-2 truncate"
      >
        {text}
      </p>
    </>
  )
}

export default function TypographyPage() {
  const t = useTranslations('typographyPage')
  const { theme, setTypography, saveTheme, saving, saved, error } = useTheme()
  const ty = theme.typography

  const update = (key: string, value: string) => {
    setTypography({ ...ty, [key]: value })
  }

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h2 className="text-base font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-xs text-gray-400 mt-1">{t('subheading')}</p>
      </div>

      {/* Live preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
          {t('preview.title')}
        </p>
        <FontPreview font={ty.headingFont} weight={ty.headingWeight} text={`${ty.headingFont} ${t('preview.headingSuffix')}`} />
        <FontPreview font={ty.bodyFont}    weight={ty.bodyWeight}    text={t('preview.bodySample')} />
        <FontPreview font={ty.monoFont}    weight="400"              text={t('preview.monoSample')} />
      </div>

      {/* Font families */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('sections.fonts.title')}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('sections.fonts.description')}</p>
        </div>
        <div className="divide-y divide-gray-100">

          {/* Heading font */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-700">{t('fonts.headingFont')}</label>
            <select
              value={ty.headingFont}
              onChange={(e) => update('headingFont', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <FontPreview font={ty.headingFont} weight={ty.headingWeight} text={`The quick brown fox — ${ty.headingFont}`} />
          </div>

          {/* Body font */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-700">{t('fonts.bodyFont')}</label>
            <select
              value={ty.bodyFont}
              onChange={(e) => update('bodyFont', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <FontPreview font={ty.bodyFont} weight={ty.bodyWeight} text={`The quick brown fox — ${ty.bodyFont}`} />
          </div>

          {/* Mono font */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-700">{t('fonts.monoFont')}</label>
            <select
              value={ty.monoFont}
              onChange={(e) => update('monoFont', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
            >
              {MONO_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <FontPreview font={ty.monoFont} weight="400" text={`const value = "monospace" — ${ty.monoFont}`} />
          </div>
        </div>
      </div>

      {/* Font weights */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('sections.weights.title')}
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-700">{t('weights.headingWeight')}</label>
            <div className="flex gap-2 flex-wrap">
              {WEIGHTS.map((w) => (
                <button
                  key={w}
                  onClick={() => update('headingWeight', w)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition ${
                    ty.headingWeight === w
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-700">{t('weights.bodyWeight')}</label>
            <div className="flex gap-2 flex-wrap">
              {WEIGHTS.map((w) => (
                <button
                  key={w}
                  onClick={() => update('bodyWeight', w)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition ${
                    ty.bodyWeight === w
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scale */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('sections.scale.title')}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('sections.scale.description')}</p>
        </div>
        <div className="px-5 py-4 flex gap-3">
          {SCALES.map((s) => (
            <button
              key={s.id}
              onClick={() => update('scale', s.id)}
              className={`flex-1 py-3 px-3 rounded-lg border text-left transition ${
                ty.scale === s.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-xs font-semibold">{s.label}</p>
              <p className={`text-[11px] mt-0.5 ${ty.scale === s.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {s.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={saveTheme}
        disabled={saving}
        className="self-start px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 transition"
      >
        {saved ? t('save.savedConfirmation') : saving ? t('save.saving') : t('save.button')}
      </button>
    </div>
  )
}