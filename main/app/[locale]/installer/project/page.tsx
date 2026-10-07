// ProjectInfoPage.tsx  (installer step 2: project name, domain, subdomain)
'use client'

import { Button }                from '@/components/ui/button'
import { Input }                 from '@/components/ui/input'
import { Label }                 from '@/components/ui/label'
import { useRouter }             from 'next/navigation'
import { useState, useCallback } from 'react'
import { useInstallerStore }     from '../../../store/useInstallerStore'
import { Loader2 }               from 'lucide-react'
import { useTranslations }       from 'next-intl'
import InstallerShell, { CARD, PRIMARY_BUTTON, INPUT_CLASS } from '@/core/InstallerShell'

export default function ProjectInfoPage() {
  const router = useRouter()
  const { setInstallerValue } = useInstallerStore()
  const t = useTranslations('projectInfoPage')

  const [name,      setName]      = useState('')
  const [subdomain, setSubdomain] = useState('console')
  const [domain,    setDomain]    = useState('http://localhost:3000')
  const [loading,   setLoading]   = useState(false)

  const [nameError,      setNameError]      = useState('')
  const [subdomainError, setSubdomainError] = useState('')
  const [domainError,    setDomainError]    = useState('')

  /** Only lowercase letters are allowed in the project name. */
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitised = e.target.value.replace(/[^a-z]/g, '')
    setName(sanitised)
  }, [])

  const handleContinue = useCallback(() => {
    let hasError = false

    if (!name.trim()) {
      setNameError(t('errors.nameRequired'))
      hasError = true
    } else if (!/^[a-z]+$/.test(name)) {
      setNameError(t('errors.nameInvalid'))
      hasError = true
    } else {
      setNameError('')
    }

    if (!subdomain.trim()) {
      setSubdomainError(t('errors.subdomainRequired'))
      hasError = true
    } else {
      setSubdomainError('')
    }

    if (!domain.trim()) {
      setDomainError(t('errors.domainRequired'))
      hasError = true
    } else {
      setDomainError('')
    }

    if (hasError) return

    setLoading(true)
    setInstallerValue('projectName', name)
    setInstallerValue('subdomain', subdomain)
    setInstallerValue('domain', domain)

    setTimeout(() => {
      router.push('/installer/admin')
    }, 500)
  }, [name, subdomain, domain, setInstallerValue, router, t])

  return (
    <InstallerShell step={2} width="sm" logoAlt={t('logoAlt')} tagline={t('tagline')}>
      <div className={CARD}>

        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('subheading')}</p>

        <div className="mt-6 space-y-5">

          {/* Project name */}
          <div className="space-y-1.5">
            <Label htmlFor="projectName" className="text-sm font-medium text-neutral-800">
              {t('fields.name.label')}
            </Label>
            <Input
              id="projectName"
              placeholder={t('fields.name.placeholder')}
              value={name}
              onChange={handleNameChange}
              className={`${INPUT_CLASS} ${nameError ? 'border-red-500' : ''}`}
            />
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
            <p className="text-xs text-neutral-500">{t('fields.name.hint')}</p>
          </div>

          {/* Domain */}
          <div className="space-y-1.5">
            <Label htmlFor="domain" className="text-sm font-medium text-neutral-800">
              {t('fields.domain.label')}
            </Label>
            <Input
              id="domain"
              placeholder={t('fields.domain.placeholder')}
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className={`${INPUT_CLASS} ${domainError ? 'border-red-500' : ''}`}
            />
            {domainError && <p className="text-xs text-red-600">{domainError}</p>}
            <p className="text-xs text-neutral-500">
              {t('fields.domain.hint')}{' '}
              <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono">localhost:3000</code>.
            </p>
          </div>

          {/* Subdomain */}
          <div className="space-y-1.5">
            <Label htmlFor="subdomain" className="text-sm font-medium text-neutral-800">
              {t('fields.subdomain.label')}
            </Label>
            <Input
              id="subdomain"
              placeholder={t('fields.subdomain.placeholder')}
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              className={`${INPUT_CLASS} ${subdomainError ? 'border-red-500' : ''}`}
            />
            {subdomainError && <p className="text-xs text-red-600">{subdomainError}</p>}
            <p className="text-xs text-neutral-500">
              {t('fields.subdomain.hint')}{' '}
              <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono">
                {subdomain || 'console'}.yourdomain.com
              </code>
            </p>
          </div>

        </div>

        <Button
          className={`${PRIMARY_BUTTON} mt-8 w-full`}
          onClick={handleContinue}
          disabled={loading}
        >
          {loading
            ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            : t('continueButton')
          }
        </Button>

      </div>
    </InstallerShell>
  )
}