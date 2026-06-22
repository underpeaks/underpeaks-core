// app/[locale]/license-expired/page.tsx (Core)
'use client'

export default function LicenseExpiredPage() {
  const accent = '#00d9a3'
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-5xl">⏰</div>
      <h1 className="text-2xl font-bold text-white">License Expired</h1>
      <p className="text-sm max-w-md" style={{ color: '#888' }}>
        Your NXTFlutter installation has not been able to reach Studio for more than 30 days.
        Please ensure your server can reach Studio and restart the application.
      </p>
      <div className="flex gap-3">
        <a
          href="https://www.nxtflutter.com"
          className="px-6 py-3 rounded-lg text-sm font-medium"
          style={{ backgroundColor: accent, color: '#000' }}
        >
          Go to Studio
        </a>
        <a
          href="/api/license/phone-home"
          className="px-6 py-3 rounded-lg text-sm font-medium border"
          style={{ borderColor: accent, color: accent }}
        >
          Retry Connection
        </a>
      </div>
    </div>
  )
}