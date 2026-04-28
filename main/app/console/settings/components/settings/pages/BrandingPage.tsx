'use client';

import { useState, useRef } from 'react';
import { FiUpload, FiX, FiImage, FiCheck, FiAlertCircle } from 'react-icons/fi';

// ── Reusable upload zone ───────────────────────────────────────────────────────
function UploadZone({
  label,
  hint,
  accept,
  preview,
  recommended,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  accept: string;
  preview: string | null;
  recommended: string;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-700">{label}</label>

      {preview ? (
        <div className="relative flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="w-16 h-16 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
            <img src={preview} alt={label} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">Uploaded</p>
            <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-100 transition text-gray-600"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
            >
              <FiX size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 cursor-pointer transition-colors ${
            dragging ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <FiUpload size={16} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">
              Drag & drop or <span className="text-blue-500">browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
          </div>
          <p className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            Recommended: {recommended}
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-4 flex flex-col gap-5">{children}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BrandingPage() {
  const [cmsName,      setCmsName]      = useState('NXTFlutter');
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const handleFile = (
    file: File,
    setPreview: (v: string | null) => void,
    maxSizeKb: number,
  ) => {
    setError(null);
    if (file.size > maxSizeKb * 1024) {
      setError(`File too large. Max size is ${maxSizeKb}KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 900);
  };

  return (
    <div className="flex flex-col gap-5">

      <div>
        <h2 className="text-lg font-bold text-gray-900">CMS Branding</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Customise how the CMS looks to your team. This is separate from your app's theming.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <FiAlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <FiX size={13} />
          </button>
        </div>
      )}

      {/* CMS name */}
      <SectionCard title="CMS Name">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-700">Display Name</label>
          <input
            value={cmsName}
            onChange={(e) => setCmsName(e.target.value)}
            placeholder="e.g. My CMS"
            className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition"
          />
          <p className="text-[11px] text-gray-400">
            Shown in the browser tab, topnav, and email notifications.
          </p>
        </div>
      </SectionCard>

      {/* Logo */}
      <SectionCard title="CMS Logo">
        <UploadZone
          label="Logo"
          hint="PNG or SVG with transparent background"
          accept="image/png,image/svg+xml,image/webp"
          preview={logoPreview}
          recommended="200×60px"
          onFile={(f) => handleFile(f, setLogoPreview, 512)}
          onClear={() => setLogoPreview(null)}
        />

        {/* Live preview */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Topnav Preview</p>
          <div className="flex items-center gap-3 px-5 h-14 bg-white border border-gray-200 rounded-lg shadow-sm">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="h-7 w-auto object-contain" />
            ) : (
              <span className="text-gray-800 font-semibold text-base">{cmsName || 'CMS Name'}</span>
            )}
            <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-200 bg-gray-50 ml-2">
              <span className="text-[10px] text-gray-400">Project:</span>
              <span className="text-xs font-semibold text-gray-600">Default</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Favicon */}
      <SectionCard title="Favicon">
        <UploadZone
          label="Favicon"
          hint="ICO, PNG or SVG — shown in browser tabs"
          accept="image/x-icon,image/png,image/svg+xml"
          preview={faviconPreview}
          recommended="32×32px or 64×64px"
          onFile={(f) => handleFile(f, setFaviconPreview, 256)}
          onClear={() => setFaviconPreview(null)}
        />

        {/* Browser tab preview */}
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Browser Tab Preview</p>
          <div className="flex items-center gap-0 w-fit">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-b-0 border-gray-200 rounded-t-lg shadow-sm min-w-[160px]">
              {faviconPreview ? (
                <img src={faviconPreview} alt="Favicon" className="w-4 h-4 object-contain shrink-0" />
              ) : (
                <FiImage size={13} className="text-gray-300 shrink-0" />
              )}
              <span className="text-xs text-gray-600 truncate">{cmsName || 'CMS Name'}</span>
              <div className="ml-auto w-3 h-3 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <FiX size={8} className="text-gray-400" />
              </div>
            </div>
            <div className="flex-1 h-px bg-gray-200 w-8" />
          </div>
          <div className="h-2 bg-gray-100 border border-t-0 border-gray-200 rounded-b-lg" />
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
  );
}