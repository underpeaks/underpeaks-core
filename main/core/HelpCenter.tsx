// core/HelpCenter.tsx  (same folder as LocaleSwitcher.tsx)
'use client'

/**
 * HelpCenter
 *
 * HelpDialog  — controlled dialog: searchable list of known issues + fixes.
 * HelpButton  — self-contained button that opens HelpDialog. Drop it next to
 *               LocaleSwitcher (e.g. in the installer layout).
 */

import { useMemo, useState } from 'react'
import { LifeBuoy, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { KNOWN_ISSUES, DISCORD_URL, GITHUB_ISSUES_URL } from './known-issues'

interface HelpDialogProps {
  open:         boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const [query,      setQuery]      = useState('')
  const [selectedId, setSelectedId] = useState<string>(KNOWN_ISSUES[0]?.id ?? '')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KNOWN_ISSUES
    return KNOWN_ISSUES.filter((issue) =>
      [issue.title, issue.symptoms, ...issue.keywords, ...issue.steps]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [query])

  const selected =
    filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null

  const linkClass =
    'inline-flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">

        <DialogHeader className="border-b border-neutral-200 px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold">Help and known issues</DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            Search for your problem below. Can&apos;t find it? Ask us on Discord or log an issue on GitHub.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">

          {/* Sidebar: search + list */}
          <div className="flex max-h-56 shrink-0 flex-col border-b border-neutral-200 md:max-h-none md:w-80 md:border-b-0 md:border-r">
            <div className="relative border-b border-neutral-200 p-3">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search issues…"
                className="h-9 pl-9"
                aria-label="Search known issues"
              />
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {filtered.map((issue) => {
                const active = selected?.id === issue.id
                return (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(issue.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-black font-medium text-white'
                          : 'text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {issue.title}
                    </button>
                  </li>
                )
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-neutral-500">
                  No matching issues.
                </li>
              )}
            </ul>
          </div>

          {/* Detail */}
          <div className="flex-1 overflow-y-auto p-6">
            {selected ? (
              <article className="space-y-5">
                <h3 className="text-xl font-semibold tracking-tight">{selected.title}</h3>

                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">
                    What you see
                  </p>
                  <p className="rounded-lg bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-800">
                    {selected.symptoms}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-neutral-500">
                    How to fix it
                  </p>
                  <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-neutral-800">
                    {selected.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                {selected.code && (
                  <pre className="overflow-x-auto rounded-lg bg-black px-4 py-3 font-mono text-xs leading-relaxed text-white">
                    {selected.code.join('\n')}
                  </pre>
                )}
              </article>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-neutral-600">
                  Nothing matched your search. We can help directly:
                </p>
                <div className="flex gap-2">
                  <a className={linkClass} href={DISCORD_URL} target="_blank" rel="noreferrer">Join Discord</a>
                  <a className={linkClass} href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer">Log an issue</a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-3">
          <p className="text-xs text-neutral-500">Still stuck? We read everything.</p>
          <div className="flex gap-2">
            <a className={linkClass} href={DISCORD_URL} target="_blank" rel="noreferrer">Join Discord</a>
            <a className={linkClass} href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer">Log an issue</a>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}

export default function HelpButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <LifeBuoy className="h-4 w-4" />
        Help
      </Button>
      <HelpDialog open={open} onOpenChange={setOpen} />
    </>
  )
}