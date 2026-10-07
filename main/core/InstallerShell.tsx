// core/InstallerShell.tsx  (same folder as LocaleSwitcher.tsx)
'use client'

/**
 * InstallerShell
 *
 * Shared frame for every installer page: top bar (logo, Help button, language
 * switcher), a segmented progress indicator and a centred content column.
 * Also exports the style tokens used by all installer pages so they stay
 * consistent.
 */

import { ReactNode } from 'react'
import LocaleSwitcher from '@/core/LocaleSwitcher'
import HelpButton     from '@/core/HelpCenter'

/** Welcome, Project, Admin, Stack, Database, Demo, Finalise, Done */
export const TOTAL_STEPS = 8

export const CARD           = 'rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8'
export const PRIMARY_BUTTON = 'h-11 rounded-lg bg-black text-base text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500'
export const OUTLINE_BUTTON = 'h-11 rounded-lg border border-neutral-300 bg-white text-base text-neutral-900 hover:bg-neutral-100 disabled:opacity-50'
export const INPUT_CLASS    = 'h-10 rounded-lg'

const WIDTHS = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
} as const

interface InstallerShellProps {
  logoAlt:  string
  step:     number
  tagline?: string
  width?:   keyof typeof WIDTHS
  children: ReactNode
}

export default function InstallerShell({
  logoAlt,
  step,
  tagline,
  width = 'sm',
  children,
}: InstallerShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">

      {/* Top bar */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <img
            src="/images/logo/underpeaks_logo.png"
            alt={logoAlt}
            className="h-9 w-auto"
          />
          <div className="flex items-center gap-2">
            <HelpButton />
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full ${WIDTHS[width]} px-6 pb-16 pt-8 animate-in fade-in slide-in-from-bottom-2 duration-500`}
      >
        {/* Segmented progress */}
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
          className="flex gap-1.5"
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-black' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>

        {tagline && (
          <p className="mt-6 text-center text-sm text-neutral-500">{tagline}</p>
        )}

        <div className={tagline ? 'mt-6' : 'mt-10'}>{children}</div>
      </main>
    </div>
  )
}