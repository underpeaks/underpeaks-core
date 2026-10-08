'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { ShieldCheck, Sparkles, Rocket, X, Database, Code, Share2, Globe, Layers, Zap } from 'lucide-react'

interface HostedUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * HostedUpgradeDialog
 *
 * Layout (responsive):
 *   - Phones / narrow windows: panels stack (info on top, features below) and the
 *     whole dialog body scrolls.
 *   - md and up: side by side (40% / 60%). The dialog keeps a fixed height, and each
 *     panel scrolls on its own if the window is short, so the buttons stay reachable.
 *   - The close button sits outside the scroll area, so it is always visible.
 */
export default function HostedUpgradeDialog({
  open,
  onOpenChange,
}: HostedUpgradeDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>

        {/* Overlay */}
        <AlertDialogPrimitive.Overlay
          onClick={() => onOpenChange(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
          }}
        />

        {/* Content — centred, never larger than the viewport */}
        <AlertDialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[51] flex w-[calc(100vw-1.5rem)] max-w-[1100px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white outline-none max-h-[calc(100vh-1.5rem)] md:h-[min(720px,calc(100vh-4rem))]"
        >
          {/* CLOSE BUTTON — outside the scroll area so it never scrolls away */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#111',
              zIndex: 10,
            }}
          >
            <X size={16} />
          </button>

          {/* Body — scrolls as one on small screens, split panels on md+ */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">

            {/* LEFT SIDE */}
            <div
              className="flex w-full shrink-0 flex-col justify-between gap-6 p-6 text-white md:w-2/5 md:overflow-y-auto md:p-8"
              style={{ background: 'linear-gradient(135deg, #000, #1f1f1f, #2d2d2d)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Rocket size={22} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
                      Hosted Platform
                    </p>
                    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>Underpeaks Cloud</p>
                  </div>
                </div>

                <div>
                  <AlertDialogPrimitive.Title
                    style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.5rem' }}
                  >
                    Unlock Premium Features
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description
                    style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}
                  >
                    The all-in-one self-hosted CMS and code generator. Connect any database,
                    generate your backend, and ship faster — without DevOps complexity.
                  </AlertDialogPrimitive.Description>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[
                    { emoji: '🗄️', text: 'Firebase, Supabase, PostgreSQL, MySQL & MongoDB' },
                    { emoji: '⚡', text: 'Auto-generate schemas, models & CMS UI' },
                    { emoji: '🔗', text: 'Share & reuse schemas across projects' },
                    { emoji: '🛡️', text: 'Self-hosted with full data ownership' },
                    { emoji: '📦', text: 'Built-in CMS console, no extra tooling' },
                    { emoji: '🔑', text: 'Auth, roles & project scoping built-in' },
                  ].map(({ emoji, text }) => (
                    <p key={text} style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span>{emoji}</span>
                      <span>{text}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex w-full flex-col gap-4 bg-white p-6 md:min-h-0 md:w-3/5 md:p-8 md:pt-14">

              {/* Feature grid — 1 column on phones, 2 on small, 3 on large */}
              <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 md:min-h-0 md:overflow-y-auto md:content-start md:pr-1">
                {[
                  { icon: <Code size={16} />, title: 'Code Generation', desc: 'Auto-generate schemas, models and CMS UI from your data definitions.' },
                  { icon: <Share2 size={16} />, title: 'Schema Sharing', desc: 'Share and reuse model schemas across projects and teams instantly.' },
                  { icon: <Sparkles size={16} />, title: 'CMS Built-in', desc: 'Manage content, users and projects through a ready-made console.' },
                  { icon: <Globe size={16} />, title: 'i18n Ready', desc: 'Multi-language support out of the box — ship to global audiences.' },
                  { icon: <Layers size={16} />, title: 'Project Scoping', desc: 'Everything scoped to a project_id — clean multi-tenant architecture.' },
                  { icon: <Zap size={16} />, title: 'Instant Setup', desc: 'Demo content, adapters and auth wired up and ready on first run.' },
                  { icon: <Rocket size={16} />, title: 'Managed Hosting', desc: 'Deployments, updates and monitoring handled — focus on your product.' },
                ].map(({ icon, title, desc }) => (
                  <div
                    key={title}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '0.875rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    {icon}
                    <p style={{ fontWeight: 600, fontSize: '0.8rem', marginTop: '0.25rem' }}>{title}</p>
                    <p style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.4 }}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Actions — always visible at the bottom of the panel */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', flexShrink: 0 }}>
                <AlertDialogPrimitive.Cancel
                  style={{
                    fontSize: '0.85rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  Maybe Later
                </AlertDialogPrimitive.Cancel>
                <AlertDialogPrimitive.Action asChild>
                  <a
                    href="https://underpeaks.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '0.5rem',
                      background: '#000',
                      color: '#fff',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Upgrade Now
                  </a>
                </AlertDialogPrimitive.Action>
              </div>
            </div>

          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}