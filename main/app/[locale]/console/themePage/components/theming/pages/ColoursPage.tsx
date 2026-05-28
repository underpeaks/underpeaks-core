'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from '../../../ThemeContext';

const TOKEN_META: Record<string, { label: string; description: string }> = {
  'primary':       { label: 'Primary',             description: 'Main brand colour — buttons, links, highlights'  },
  'primary-fg':    { label: 'Primary Foreground',  description: 'Text on primary colour backgrounds'              },
  'secondary':     { label: 'Secondary',           description: 'Supporting brand colour'                         },
  'secondary-fg':  { label: 'Secondary Foreground',description: 'Text on secondary colour backgrounds'            },
  'accent':        { label: 'Accent',              description: 'Highlight colour for badges and tags'            },
  'background':    { label: 'Background',          description: 'Main app background'                             },
  'surface':       { label: 'Surface',             description: 'Card and panel background'                       },
  'border':        { label: 'Border',              description: 'Default border colour'                           },
  'success':       { label: 'Success',             description: 'Positive states and confirmations'               },
  'warning':       { label: 'Warning',             description: 'Warnings and caution states'                     },
  'danger':        { label: 'Danger',              description: 'Errors and destructive actions'                  },
  'text':          { label: 'Text Primary',        description: 'Main body text colour'                           },
  'text-muted':    { label: 'Text Muted',          description: 'Secondary and placeholder text'                  },
}

const DEFAULT_COLOURS: Record<string, string> = {
  'primary':       '#0A0A0A',
  'primary-fg':    '#FFFFFF',
  'secondary':     '#404040',
  'secondary-fg':  '#FFFFFF',
  'accent':        '#6366F1',
  'background':    '#F9FAFB',
  'surface':       '#FFFFFF',
  'border':        '#E5E7EB',
  'success':       '#22C55E',
  'warning':       '#F59E0B',
  'danger':        '#EF4444',
  'text':          '#111827',
  'text-muted':    '#6B7280',
}

export default function ColoursPage() {
  const t = useTranslations('coloursPage')
  const { theme, setColours, saveTheme, saving, saved, error } = useTheme()
  const colours = theme.colours

  const updateColour = (key: string, value: string) => {
    setColours({ ...colours, [key]: value })
    // Inject instantly on change for live preview
    document.documentElement.style.setProperty(`--color-${key}`, value)
  }

  const resetToken = (key: string) => {
    updateColour(key, DEFAULT_COLOURS[key] ?? '#000000')
  }

  const resetAll = () => {
    setColours({ ...DEFAULT_COLOURS })
    Object.entries(DEFAULT_COLOURS).forEach(([k, v]) => {
      document.documentElement.style.setProperty(`--color-${k}`, v)
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900">{t('heading')}</h2>
        <p className="text-xs text-gray-400 mt-1">{t('subheading')}</p>
      </div>

      {/* Live preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
          {t('preview.title')}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            style={{ backgroundColor: colours['primary'], color: colours['primary-fg'] }}
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            {t('preview.primaryButton')}
          </button>
          <button
            style={{ backgroundColor: colours['secondary'], color: colours['secondary-fg'] }}
            className="px-4 py-2 rounded-md text-sm font-medium"
          >
            {t('preview.secondaryButton')}
          </button>
          <span
            style={{ backgroundColor: colours['accent'] + '20', color: colours['accent'], border: `1px solid ${colours['accent']}40` }}
            className="px-3 py-1 rounded-full text-xs font-medium"
          >
            {t('preview.accentBadge')}
          </span>
          <span style={{ color: colours['success'] }} className="text-sm font-medium">{t('preview.success')}</span>
          <span style={{ color: colours['warning'] }} className="text-sm font-medium">{t('preview.warning')}</span>
          <span style={{ color: colours['danger'] }}  className="text-sm font-medium">{t('preview.danger')}</span>
        </div>
      </div>

      {/* Token list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('tokensSectionTitle')}
          </p>
          <button
            onClick={resetAll}
            className="text-xs text-gray-400 hover:text-gray-600 transition"
          >
            {t('resetAllButton')}
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {Object.entries(TOKEN_META).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-4 px-5 py-3">

              {/* Colour swatch + native picker */}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shadow-sm"
                  style={{ backgroundColor: colours[key] ?? DEFAULT_COLOURS[key] }}
                />
                <input
                  type="color"
                  value={colours[key] ?? DEFAULT_COLOURS[key]}
                  onChange={(e) => updateColour(key, e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title={`Pick colour for ${meta.label}`}
                />
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
                <p className="text-[11px] text-gray-400 truncate">{meta.description}</p>
              </div>

              {/* Hex input */}
              <input
                type="text"
                value={colours[key] ?? DEFAULT_COLOURS[key]}
                onChange={(e) => {
                  const val = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) updateColour(key, val)
                }}
                className="w-24 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 text-center"
                maxLength={7}
              />

              {/* Reset to default */}
              <button
                onClick={() => resetToken(key)}
                className="text-[10px] text-gray-400 hover:text-gray-600 transition shrink-0"
                title={t('resetTokenTitle')}
              >
                ↺
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={saveTheme}
        disabled={saving}
        className="self-start px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-40 transition"
      >
        {saved ? t('savedMessage') : saving ? t('saveButtonSaving') : t('saveButtonIdle')}
      </button>
    </div>
  )
}