'use client'

import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'
import type { ClientTemplateProps } from '../../types'

export default function SplashTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Splash'} subtitle="Splash screen" slug={page.slug}>
      <div className="w-full h-full flex flex-col items-center justify-center gap-6
                      bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/70 text-white">
        <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center">
          <span className="text-5xl font-bold">N</span>
        </div>
        <div className="text-center px-8">
          <p className="text-2xl font-bold">{page.seo_title ?? 'Welcome'}</p>
          <p className="text-sm text-white/70 mt-2">{page.seo_description ?? 'Loading your experience'}</p>
        </div>
        <div className="absolute bottom-12 flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </PhoneFrame>
  )
}