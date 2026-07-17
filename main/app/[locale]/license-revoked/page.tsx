// app/[locale]/license-revoked/page.tsx (Core)
'use client'

export default function LicenseRevokedPage() {
  const accent = '#00d9a3'
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-5xl">🔒</div>
      <h1 className="text-2xl font-bold text-white">License Revoked</h1>
      <p className="text-sm max-w-md" style={{ color: '#888' }}>
        Your Underpeaks license has been revoked. Please contact support or log in to your
        Studio account to resolve this issue.
      </p>
      <a
        href="https://underpeaks.com"
        className="px-6 py-3 rounded-lg text-sm font-medium"
        style={{ backgroundColor: accent, color: '#000' }}
      >
        Go to Studio
      </a>
    </div>
  )
}