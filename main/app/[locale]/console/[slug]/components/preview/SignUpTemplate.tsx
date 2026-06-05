'use client'

import { FiUser, FiMail, FiLock, FiArrowRight } from 'react-icons/fi'
import type { ClientTemplateProps } from '../../types'
import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

export default function SignUpTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Sign Up'} subtitle="Sign up screen" slug={page.slug}>
      <div className="w-full h-full flex flex-col bg-white px-8 pt-16 pb-8">

        <div className="mb-6">
          <p className="text-3xl font-bold text-gray-900">Create account</p>
          <p className="text-sm text-gray-500 mt-1">Sign up to get started</p>
        </div>

        <div className="space-y-3 flex-1">
          <div>
            <label className="text-xs font-medium text-gray-600">Full name</label>
            <div className="relative mt-1">
              <FiUser size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Alex Jones"
                     className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50" disabled />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <div className="relative mt-1">
              <FiMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="email" placeholder="you@example.com"
                     className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50" disabled />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Password</label>
            <div className="relative mt-1">
              <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" placeholder="At least 8 characters"
                     className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50" disabled />
            </div>
          </div>

          <label className="flex items-start gap-2 mt-2">
            <input type="checkbox" className="mt-0.5 rounded" disabled />
            <span className="text-[10px] text-gray-500">
              I agree to the <span className="text-[var(--color-primary)]">Terms</span> and{' '}
              <span className="text-[var(--color-primary)]">Privacy Policy</span>
            </span>
          </label>
        </div>

        <div className="space-y-3 mt-6">
          <button className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl
                             text-sm font-bold flex items-center justify-center gap-2">
            Create account <FiArrowRight size={14} />
          </button>
          <p className="text-center text-xs text-gray-500">
            Already have an account?{' '}
            <span className="text-[var(--color-primary)] font-medium">Sign in</span>
          </p>
        </div>
      </div>
    </PhoneFrame>
  )
}