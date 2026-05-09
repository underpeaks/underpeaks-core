'use client'

import { useState, useEffect } from 'react'
import { FiX, FiImage, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { useConsoleStore } from '@/app/store/consoleStore'
import { UploadZone } from '@/app/lib/uploads/UploadZone'
import { UploadResult } from '@/app/lib/uploads/types'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-4 flex flex-col gap-5">{children}</div>
    </div>
  )
}

export default function BrandingPage() {
  const { config, user, loadConfig } = useConsoleStore()

  const [logoUrl,    setLogoUrl]    = useState<string>('')
  const [faviconUrl, setFaviconUrl] = useState<string>('')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const projectName = config?.project_name ?? 'Default'

  useEffect(() => {
    if (config?.branding?.logo_url)    setLogoUrl(config.branding.logo_url)
    if (config?.branding?.favicon_url) setFaviconUrl(config.branding.favicon_url)
  }, [config])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/update-branding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:     user?.user_id,
          logo_url:    logoUrl,
          favicon_url: faviconUrl,
        }),
      })
      if (res.ok) {
        loadConfig({
          ...(config ?? {}),
          branding: {
            ...(config?.branding ?? {}),
            logo_url:    logoUrl,
            favicon_url: faviconUrl,
          },
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to save branding')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">

      <div>
        <h2 className="text-lg font-bold text-gray-900">CMS Branding</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Customise how the CMS looks to your team.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <FiAlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <FiX size={13} />
          </button>
        </div>
      )}

      {/* Logo */}
      <SectionCard title="CMS Logo">
        <UploadZone
          config={{
            folder:      'images/logo',
            fileType:    'image',
            maxSizeKb:   512,
            label:       'Logo',
            hint:        'PNG or SVG with transparent background',
            recommended: '200×60px',
            resize:      { width: 400, height: 120, fit: 'inside' },
          }}
          initialPreview={config?.branding?.logo_url || null}
          onUploaded={(r: UploadResult) => setLogoUrl(r.url)}
          onError={setError}
          onClear={() => setLogoUrl('')}
        />

        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Topnav Preview</p>
          <div className="flex items-center gap-3 px-5 h-14 bg-white border border-gray-200 rounded-lg shadow-sm">
            
               <img
                    src={logoUrl || '/images/logo/NXT_Flutter_logo.png'}
                    alt="Logo"
                    className="h-7 w-auto object-contain"
                />
             
            
            <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-200 bg-gray-50 ml-2">
              <span className="text-[10px] text-gray-400">Project:</span>
              <span className="text-xs font-semibold text-gray-600">{projectName}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Favicon */}
      <SectionCard title="Favicon">
        <UploadZone
          config={{
            folder:      'images/favicon',
            fileType:    'image',
            maxSizeKb:   256,
            label:       'Favicon',
            hint:        'ICO, PNG or SVG — shown in browser tabs',
            recommended: '32×32px or 64×64px',
            resize:      { width: 64, height: 64, fit: 'cover' },
          }}
          initialPreview={config?.branding?.favicon_url || null}
          onUploaded={(r: UploadResult) => setFaviconUrl(r.url)}
          onError={setError}
          onClear={() => setFaviconUrl('')}
        />

        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Topnav Preview</p>
          <div className="flex items-center gap-3 px-5 h-14 bg-white border border-gray-200 rounded-lg shadow-sm">
            
               <img
                    src={faviconUrl || '/images/favicon/NXT_Flutter_favicon.png'}
                    alt="Logo"
                    className="h-7 w-auto object-contain"
                />
             
            
            <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-200 bg-gray-50 ml-2">
              <span className="text-[10px] text-gray-400">Project:</span>
              <span className="text-xs font-semibold text-gray-600">{projectName}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Save */}
      <div className="flex items-center justify-between pt-1">
        {saved && (
          <p className="text-xs text-green-600 flex items-center gap-1.5">
            <FiCheck size={13} /> Branding saved successfully
          </p>
        )}
        <div className="ml-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {saving && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </div>
      </div>

    </div>
  )
}