// core/AuthShell.tsx  (same folder as LocaleSwitcher.tsx)
'use client'

/**
 * AuthShell
 *
 * Shared frame for the sign-in, sign-up, forgot-password and reset-password
 * pages: top bar (logo, Help button, language switcher) and a vertically
 * centred content column.
 */

import { ReactNode } from 'react'
import LocaleSwitcher from '@/core/LocaleSwitcher'
import HelpButton     from '@/core/HelpCenter'

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-950">

      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <img
            src="/images/logo/underpeaks_logo.png"
            alt="Underpeaks"
            className="h-9 w-auto"
          />
          <div className="flex items-center gap-2">
            <HelpButton />
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-full max-w-md">{children}</div>
      </main>

    </div>
  )
}