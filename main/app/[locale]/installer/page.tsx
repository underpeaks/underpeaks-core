// WelcomePage.tsx  (installer step 1)
'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { useTranslations }     from 'next-intl'
import { Checkbox }            from '@/components/ui/checkbox'
import { Button }              from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Check, Loader2, ArrowRight, LifeBuoy } from 'lucide-react'
import InstallerShell, { PRIMARY_BUTTON } from '@/core/InstallerShell'
import { HelpDialog }          from '@/core/HelpCenter'
import { DISCORD_URL, GITHUB_ISSUES_URL } from '@/core/known-issues'

export default function WelcomePage() {
  const t      = useTranslations('welcomePage')
  const router = useRouter()

  const [accepted,    setAccepted]    = useState(false)
  const [licenseText, setLicenseText] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [helpOpen,    setHelpOpen]    = useState(false)

  // Is there already an installation on this server? (/api/installer/status)
  //   installed:  a database with users exists
  //   canProceed: this browser may re-run the installer (signed-in admin, or
  //               the owner set NXF_ALLOW_REINSTALL=true)
  const [status,      setStatus]      = useState<{ installed: boolean; canProceed: boolean } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    fetch('/license.txt')
      .then((res) => res.text())
      .then((text) => setLicenseText(text))
      .catch(() => setLicenseText(t('license.loadFailed')))
  }, [])

  useEffect(() => {
    // If the check fails, do not block a normal first install.
    fetch('/api/installer/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.installed === 'boolean') {
          setStatus({ installed: data.installed, canProceed: !!data.canProceed })
        }
      })
      .catch(() => {})
  }, [])

  const blocked = !!status?.installed && !status.canProceed

  const goToNextStep = () => {
    setConfirmOpen(false)
    setLoading(true)
    setTimeout(() => {
      router.push('/installer/project')
    }, 100)
  }

  const handleContinue = () => {
    if (blocked) return
    // An installation already exists: ask before anything is overwritten.
    if (status?.installed) {
      setConfirmOpen(true)
      return
    }
    goToNextStep()
  }

  const benefits = [
    t('benefits.item1'),
    t('benefits.item2'),
    t('benefits.item3'),
    t('benefits.item4'),
    t('benefits.item5'),
    t('benefits.item6'),
  ]

  return (
    <InstallerShell step={1} width="lg" logoAlt={t('logoAlt')}>

      {/* Hero */}
      <section className="text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('tagline')}
        </h1>
      </section>

      {/* Help box */}
      <section className="mt-10 rounded-2xl bg-black p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Need help during setup?</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-300">
                If you run into any issues, check the known issues first, join our
                Discord, or log an issue on GitHub. We read everything.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => setHelpOpen(true)}
              className="bg-white text-black hover:bg-neutral-200"
            >
              Known issues
            </Button>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-lg border border-neutral-600 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Discord
            </a>
            <a
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center rounded-lg border border-neutral-600 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mt-12">
        <h2 className="mb-5 text-center text-sm font-medium uppercase tracking-widest text-neutral-500">
          {t('benefits.heading')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {benefits.map((text, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-sm leading-relaxed text-neutral-800">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* License agreement */}
      <section className="mt-12 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h3 className="text-base font-semibold">{t('license.heading')}</h3>
        </div>

        <div className="max-h-64 overflow-y-auto bg-neutral-50 px-5 py-4 font-mono text-xs leading-relaxed text-neutral-700 whitespace-pre-wrap">
          {licenseText || t('license.loading')}
        </div>

        <label
          htmlFor="accept"
          className="flex cursor-pointer items-center gap-3 border-t border-neutral-200 px-5 py-4 transition-colors hover:bg-neutral-50"
        >
          <Checkbox
            id="accept"
            checked={accepted}
            onCheckedChange={(val) => setAccepted(!!val)}
            className="h-5 w-5 rounded border-neutral-400 data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white"
          />
          <span className="text-sm font-medium text-neutral-900">
            {t('license.acceptLabel')}
          </span>
        </label>
      </section>

      {/* Existing installation, signed out: explain how to continue */}
      {blocked && (
        <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          <p className="font-semibold">An existing installation was detected.</p>
          <p className="mt-1">
            To re-install, sign in to the console as an admin and open this page again.
            If you cannot sign in, set <code className="font-mono">NXF_ALLOW_REINSTALL=true</code> in
            your <code className="font-mono">.env.local</code>, restart the server, and
            reload this page. Remove the setting when you are done.
          </p>
        </section>
      )}

      {/* Continue */}
      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          disabled={!accepted || loading || blocked}
          onClick={handleContinue}
          className={`${PRIMARY_BUTTON} w-full px-8 sm:w-auto`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('continueLoading')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {t('continueButton')}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      {/* Re-install confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Existing installation detected</DialogTitle>
            <DialogDescription className="mt-2 leading-relaxed">
              This server already has an Underpeaks installation. If you continue,
              the installer will set everything up again and your current
              configuration will be overwritten. Back up your database first if
              you need to keep your data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={goToNextStep}>
              Yes, re-install everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InstallerShell>
  )
}