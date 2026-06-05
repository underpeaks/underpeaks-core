'use client'

import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi'
import type { ClientTemplateProps } from '../../types'
import PhoneFrame from '@/app/[locale]/preview/PhoneFrame'

export default function SignInTemplate({ page }: ClientTemplateProps) {
  return (
    <PhoneFrame title={page.name ?? page.title ?? 'Sign In'} subtitle="Sign in screen" slug={page.slug}>
      <div className="w-full h-full flex flex-col bg-white px-8 pt-16 pb-8">

        <div className="mb-8">
          <p className="text-3xl font-bold text-gray-900">Welcome back</p>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>

        <div className="space-y-3 flex-1">
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <div className="relative mt-1">
              <FiMail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Password</label>
            <div className="relative mt-1">
              <FiLock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50"
                disabled
              />
            </div>
          </div>

          <div className="text-right">
            <button className="text-xs text-[var(--color-primary)] font-medium">
              Forgot password?
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl
                             text-sm font-bold flex items-center justify-center gap-2">
            Sign in <FiArrowRight size={14} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-400 uppercase">or continue with</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600">
              Google
            </button>
            <button className="py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600">
              Apple
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            Don't have an account?{' '}
            <span className="text-[var(--color-primary)] font-medium">Sign up</span>
          </p>
        </div>
      </div>
    </PhoneFrame>
  )
}