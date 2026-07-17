'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { ShieldCheck, Sparkles, Rocket, X, Database, Code, Share2, Globe, Layers, Zap } from 'lucide-react'

interface HostedUpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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

        {/* Content */}
        <AlertDialogPrimitive.Content
          style={{
            position: 'fixed',
            top: '80px',
            left: '150px',
            right: '150px',
            bottom: '80px',
            zIndex: 51,
            display: 'flex',
            borderRadius: '1rem',
            overflow: 'hidden',
            outline: 'none',
          }}
        >
          {/* LEFT SIDE */}
          <div
            style={{
              width: '40%',
              position: 'relative',
              background: 'linear-gradient(135deg, #000, #1f1f1f, #2d2d2d)',
              color: 'white',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
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

            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Starting from</p>
              <p style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.2rem' }}>
                $29.95<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>/mo</span>
              </p>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>Hosting, updates & support included.</p>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div
            style={{
              width: '60%',
              background: 'white',
              padding: '2rem',
              paddingTop: '3.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {/* CLOSE BUTTON */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onOpenChange(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.06)',
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

            {/* 3x3 GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem', flex: 1 }}>
              {[
                { icon: <Database size={16} />, title: 'Multi-DB Support', desc: 'Firebase, Supabase, PostgreSQL, MySQL & MongoDB via one unified adapter.' },
                { icon: <Code size={16} />, title: 'Code Generation', desc: 'Auto-generate schemas, models and CMS UI from your data definitions.' },
                { icon: <Share2 size={16} />, title: 'Schema Sharing', desc: 'Share and reuse model schemas across projects and teams instantly.' },
                { icon: <ShieldCheck size={16} />, title: 'Self-Hosted', desc: 'Deploy on your own infrastructure with complete data ownership.' },
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

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
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

        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}