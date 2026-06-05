'use client'

import { FiMail, FiArrowLeft, FiKey } from 'react-icons/fi'
import type { ClientTemplateProps } from '../../types'
import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

export default function ForgotPasswordTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Forgot Password'} subtitle="Forgot password screen" slug={page.slug}>
      <div className="w-full h-full flex flex-col bg-white px-8 pt-12 pb-8">

        <button className="flex items-center gap-1 text-xs text-gray-400 mb-8">
          <FiArrowLeft size={12} /> Back to sign in
        </button>

        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
            <FiKey size={28} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">Forgot password?</p>
          <p className="text-sm text-gray-500 mt-2">
            No worries — enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="space-y-3 flex-1">
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <div className="relative mt-1">
              <FiMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" placeholder="you@example.com"
                     className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50" disabled />
            </div>
          </div>
        </div>

        <button className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold">
          Send reset link
        </button>
      </div>
    </PhoneFrame>
  )
}