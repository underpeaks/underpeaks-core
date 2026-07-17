'use client'

import { useState }            from 'react'
import { useRouter }           from 'next/navigation'
import { useTranslations }     from 'next-intl'
import { Button }              from '@/components/ui/button'
import { Checkbox }            from '@/components/ui/checkbox'
import { Label }               from '@/components/ui/label'
import { Loader2 }             from 'lucide-react'
import { useInstallerStore }   from '../../../store/useInstallerStore'
import LocaleSwitcher          from '@/core/LocaleSwitcher'
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
  const t               = useTranslations('demoPage')
  const router          = useRouter()
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-12">

      {/* Locale switcher */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* Header */}
      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/underpeaks_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      {/* Main card */}
      <div className="w-full max-w-md p-8 bg-gray-50 rounded-2xl shadow-xl border space-y-6">

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('projectType.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('projectType.description')}
          </p>
        </div>

        {/* Project type options — same pattern as RadioGroup in stack page */}
        <div className="space-y-2">
          {projectOptions.map((option) => {
            const isActive = selectedProject === option.value
            return (
              <div
                key={option.value}
                onClick={() => setSelectedProject(option.value)}
                className={`
                  flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                  ${isActive
                    ? 'border-gray-900 bg-white shadow-sm'
                    : 'border-gray-200 hover:border-gray-400 bg-white'
                  }
                `}
              >
                {/* Radio dot — matches RadioGroupItem visual */}
                <div className={`
                  mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${isActive ? 'border-gray-900' : 'border-gray-400'}
                `}>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                  )}
                </div>

                {/* Greyscale icon */}
                <div className={`
                  mt-0.5 flex-shrink-0
                  ${isActive ? 'text-gray-900' : 'text-gray-400'}
                `}>
                  {PROJECT_ICONS[option.value]}
                </div>

                {/* Label + description */}
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {projectDescriptions[option.value]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Demo content opt-in — only shown for non-blank projects */}
        {showDemoCard && (
          <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t('demoContent.title')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('demoContent.description')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="demoData"
                checked={installDemo}
                onCheckedChange={(checked) => setInstallDemo(!!checked)}
              />
              <Label htmlFor="demoData" className="text-sm font-medium text-gray-700 cursor-pointer">
                {t('demoContent.checkboxLabel')}
              </Label>
            </div>

            {/* E-commerce detail list */}
            {installDemo && selectedProject === 'ecommerce' && (
              <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
                <li>{t('demoContent.ecommerce.item1')}</li>
                <li>{t('demoContent.ecommerce.item2')}</li>
                <li>{t('demoContent.ecommerce.item3')}</li>
                <li>{t('demoContent.ecommerce.item4')}</li>
                <li>{t('demoContent.ecommerce.item5')}</li>
              </ul>
            )}
          </div>
        )}

        {/* Continue button */}
        <div className="pt-2">
          <Button className="w-full" onClick={handleNext} disabled={loading}>
            {loading
              ? <Loader2 className="animate-spin h-5 w-5" />
              : t('continueButtonIdle')
            }
          </Button>
        </div>

      </div>
    </div>
  )
}