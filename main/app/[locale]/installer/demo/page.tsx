// DemoPage.tsx  (installer step 6: project type + demo content)
'use client'

import { useState }            from 'react'
import { useRouter }           from 'next/navigation'
import { useTranslations }     from 'next-intl'
import { Button }              from '@/components/ui/button'
import { Checkbox }            from '@/components/ui/checkbox'
import { Label }               from '@/components/ui/label'
import { Loader2 }             from 'lucide-react'
import { useInstallerStore }   from '../../../store/useInstallerStore'
import InstallerShell, { CARD, PRIMARY_BUTTON } from '@/core/InstallerShell'
import {
  FiShoppingCart,
  FiGrid,
  FiList,
  FiFileText,
  FiUsers,
  FiCpu,
  FiBox,
} from 'react-icons/fi'

type ProjectType =
  | 'ecommerce'
  | 'marketplace'
  | 'listing'
  | 'blog'
  | 'social'
  | 'saas'
  | 'blank'

const PROJECT_ICONS: Record<ProjectType, React.ReactNode> = {
  ecommerce:   <FiShoppingCart size={18} />,
  marketplace: <FiGrid        size={18} />,
  listing:     <FiList        size={18} />,
  blog:        <FiFileText    size={18} />,
  social:      <FiUsers       size={18} />,
  saas:        <FiCpu         size={18} />,
  blank:       <FiBox         size={18} />,
}

export default function DemoPage() {
  const t                 = useTranslations('demoPage')
  const router            = useRouter()
  const setInstallerValue = useInstallerStore((s) => s.setInstallerValue)

  const [installDemo,     setInstallDemo]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectType>('blank')

  const projectOptions: { value: ProjectType; label: string }[] = [
    { value: 'ecommerce',   label: t('projects.ecommerce.label')   },
    { value: 'marketplace', label: t('projects.marketplace.label') },
    { value: 'listing',     label: t('projects.listing.label')     },
    { value: 'blog',        label: t('projects.blog.label')        },
    { value: 'social',      label: t('projects.social.label')      },
    { value: 'saas',        label: t('projects.saas.label')        },
    { value: 'blank',       label: t('projects.blank.label')       },
  ]

  const projectDescriptions: Record<ProjectType, string> = {
    ecommerce:   t('projects.ecommerce.description'),
    marketplace: t('projects.marketplace.description'),
    listing:     t('projects.listing.description'),
    blog:        t('projects.blog.description'),
    social:      t('projects.social.description'),
    saas:        t('projects.saas.description'),
    blank:       t('projects.blank.description'),
  }

  const handleNext = () => {
    setLoading(true)
    setInstallerValue('demoContentEnabled',  installDemo)
    setInstallerValue('selectedProjectType', selectedProject)
    setTimeout(() => router.push('/installer/finalise'), 1000)
  }

  const showDemoCard = selectedProject !== 'blank'

  return (
    <InstallerShell step={6} width="sm" logoAlt={t('logoAlt')} tagline={t('tagline')}>
      <div className={CARD}>

        <h1 className="text-2xl font-semibold tracking-tight">
          {t('projectType.title')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t('projectType.description')}
        </p>

        {/* Project type options */}
        <div role="radiogroup" className="mt-6 space-y-2">
          {projectOptions.map((option) => {
            const isActive = selectedProject === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSelectedProject(option.value)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  isActive
                    ? 'border-black bg-white shadow-sm ring-1 ring-black'
                    : 'border-neutral-200 bg-white hover:border-neutral-400'
                }`}
              >
                {/* Radio dot */}
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    isActive ? 'border-black' : 'border-neutral-400'
                  }`}
                >
                  {isActive && <span className="h-2 w-2 rounded-full bg-black" />}
                </span>

                {/* Icon */}
                <span className={`mt-0.5 shrink-0 ${isActive ? 'text-black' : 'text-neutral-400'}`}>
                  {PROJECT_ICONS[option.value]}
                </span>

                {/* Label + description */}
                <span className="flex min-w-0 flex-col">
                  <span className={`text-sm font-semibold ${isActive ? 'text-black' : 'text-neutral-700'}`}>
                    {option.label}
                  </span>
                  <span className="mt-0.5 text-xs leading-relaxed text-neutral-500">
                    {projectDescriptions[option.value]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* Demo content opt-in (non-blank projects only) */}
        {showDemoCard && (
          <div className="mt-6 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {t('demoContent.title')}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {t('demoContent.description')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="demoData"
                checked={installDemo}
                onCheckedChange={(checked) => setInstallDemo(!!checked)}
                className="h-5 w-5 rounded border-neutral-400 data-[state=checked]:border-black data-[state=checked]:bg-black data-[state=checked]:text-white"
              />
              <Label htmlFor="demoData" className="cursor-pointer text-sm font-medium text-neutral-800">
                {t('demoContent.checkboxLabel')}
              </Label>
            </div>

            {installDemo && selectedProject === 'ecommerce' && (
              <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-600">
                <li>{t('demoContent.ecommerce.item1')}</li>
                <li>{t('demoContent.ecommerce.item2')}</li>
                <li>{t('demoContent.ecommerce.item3')}</li>
                <li>{t('demoContent.ecommerce.item4')}</li>
                <li>{t('demoContent.ecommerce.item5')}</li>
              </ul>
            )}
          </div>
        )}

        <Button
          className={`${PRIMARY_BUTTON} mt-8 w-full`}
          onClick={handleNext}
          disabled={loading}
        >
          {loading
            ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            : t('continueButtonIdle')
          }
        </Button>

      </div>
    </InstallerShell>
  )
}