'use client'

import { FiArrowRight, FiCheckCircle, FiZap, FiShield, FiHeart } from 'react-icons/fi'
import type { ClientTemplateProps } from '../../types'
import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

export default function LandingTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Landing'} subtitle="Landing page" slug={page.slug}>
      <div className="w-full h-full overflow-y-auto bg-white">

        {/* Nav */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">Brand</p>
          <button className="px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg">
            Sign up
          </button>
        </div>

        {/* Hero */}
        <div className="px-6 py-12 text-center">
          <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider">
            New release
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2 leading-tight">
            {page.seo_title ?? 'Build something amazing'}
          </p>
          <p className="text-sm text-gray-500 mt-3">
            {page.seo_description ?? 'The complete platform to build, ship, and scale your next project.'}
          </p>
          <button className="mt-5 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl
                             text-sm font-bold inline-flex items-center gap-2">
            Get started <FiArrowRight size={14} />
          </button>
        </div>

        {/* Features */}
        <div className="px-6 py-8 bg-gray-50">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 text-center">
            Why choose us
          </p>
          <div className="space-y-3">
            {[
              { Icon: FiZap,    title: 'Lightning fast', body: 'Built for speed and performance' },
              { Icon: FiShield, title: 'Secure by default', body: 'Enterprise-grade security' },
              { Icon: FiHeart,  title: 'Loved by users', body: 'Rated 4.9 stars by thousands' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="bg-white p-4 rounded-xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10
                                flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 py-10 text-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary)]/70 text-white">
          <p className="text-xl font-bold">Ready to start?</p>
          <p className="text-xs text-white/80 mt-1">Join thousands building with us</p>
          <button className="mt-4 px-5 py-2.5 bg-white text-[var(--color-primary)] rounded-xl text-sm font-bold">
            Start free
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 text-center">
          <p className="text-[10px] text-gray-400">© 2026 Brand. All rights reserved.</p>
        </div>
      </div>
    </PhoneFrame>
  )
}