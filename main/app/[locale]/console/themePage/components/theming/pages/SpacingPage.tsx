'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from '../../../ThemeContext'

const RADIUS_OPTIONS  = [
  { id: 'none', label: 'None',   preview: 'rounded-none'  },
  { id: 'sm',   label: 'Small',  preview: 'rounded-sm'    },
  { id: 'md',   label: 'Medium', preview: 'rounded-md'    },
  { id: 'lg',   label: 'Large',  preview: 'rounded-lg'    },
  { id: 'xl',   label: 'X-Large',preview: 'rounded-xl'    },
  { id: 'full', label: 'Pill',   preview: 'rounded-full'  },
]

const DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compact', desc: 'Tight padding, more content visible', py: 'py-1',   px: 'px-3'   },
  { id: 'default', label: 'Default', desc: 'Balanced spacing for most use cases', py: 'py-2',   px: 'px-4'   },
  { id: 'relaxed', label: 'Relaxed', desc: 'Generous padding, easier to tap',     py: 'py-3.5', px: 'px-6'   },
]

const SHADOW_OPTIONS  = [
  { id: 'none', label: 'None',   preview: ''            },
  { id: 'sm',   label: 'Subtle', preview: 'shadow-sm'   },
  { id: 'md',   label: 'Medium', preview: 'shadow-md'   },
  { id: 'lg',   label: 'Strong', preview: 'shadow-lg'   },
]

export default function SpacingPage() {
  const t = useTranslations('spacingPage')
  const { theme, setSpacing, saveTheme, saving, saved, error } = useTheme()
  const sp = theme.spacing

  const update = (key: string, value: string) => setSpacing({ ...sp, [key]: value })

  const previewRadius  = RADIUS_OPTIONS.find((r) => r.id === sp.radius)?.preview   ?? 'rounded-md'
  const previewDensity = DENSITY_OPTIONS.find((d) => d.id === sp.density)
  const previewShadow  = SHADOW_OPTIONS.find((s) => s.id === sp.shadow)?.preview   ?? ''

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h2 className="text-base font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-xs text-gray-400 mt-1">{t('subheading')}</p>
      </div>

      {/* Live preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
          {t('preview.title')}
        </p>
        <div className="flex items-start gap-4 flex-wrap">
          <button
            className={`bg-gray-900 text-white text-sm font-medium ${previewRadius} ${previewShadow} ${previewDensity?.py ?? 'py-2'} ${previewDensity?.px ?? 'px-4'} transition`}
          >
            {t('preview.button')}
          </button>
          <div className={`bg-white border border-gray-200 p-4 ${previewRadius} ${previewShadow} min-w-[140px]`}>
            <p className="text-xs font-semibold text-gray-800">{t('preview.card')}</p>
            <p className="text-[11px] text-gray-400 mt-1">Sample content</p>
          </div>
          <input
            readOnly
            value={t('preview.input')}
            className={`px-3 py-2 text-sm border border-gray-200 bg-gray-50 ${previewRadius} focus:outline-none`}
          />
        </div>
      </div>

      {/* Border radius */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('sections.radius.title')}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('sections.radius.description')}</p>
        </div>
        <div className="px-5 py-4 flex gap-2 flex-wrap">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => update('radius', r.id)}
              className={`flex flex-col items-center gap-2 px-4 py-3 border transition ${
                sp.radius === r.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              } ${r.preview}`}
            >
              <div className={`w-8 h-8 ${sp.radius === r.id ? 'bg-white/20' : 'bg-gray-100'} ${r.preview}`} />
              <span className="text-[11px] font-medium">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('sections.density.title')}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('sections.density.description')}</p>
        </div>
        <div className="px-5 py-4 flex gap-3">
          {DENSITY_OPTIONS.map((d) => (
            <button
              key={d.id}
              onClick={() => update('density', d.id)}
              className={`flex-1 py-3 px-3 rounded-lg border text-left transition ${
                sp.density === d.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="text-xs font-semibold">{d.label}</p>
              <p className={`text-[11px] mt-0.5 ${sp.density === d.id ? 'text-gray-300' : 'text-gray-400'}`}>
                {d.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Shadow */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('sections.shadow.title')}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{t('sections.shadow.description')}</p>
        </div>
        <div className="px-5 py-4 flex gap-3 flex-wrap">
          {SHADOW_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => update('shadow', s.id)}
              className={`flex flex-col items-center gap-2 px-5 py-3 rounded-lg border transition ${
                sp.shadow === s.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className={`w-10 h-10 bg-white border border-gray-200 rounded-md ${s.preview}`} />
              <span className="text-[11px] font-medium">{s.label}</span>
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