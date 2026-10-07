// StackConfigPage.tsx  (installer step 4: choose the stack)
'use client'

import { Button }            from '@/components/ui/button'
import { useRouter }         from 'next/navigation'
import { useState }          from 'react'
import { useTranslations }   from 'next-intl'
import { useInstallerStore } from '../../../store/useInstallerStore'
import { Loader2 }           from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field'
import InstallerShell, { CARD, PRIMARY_BUTTON } from '@/core/InstallerShell'

type StackType = 'next' | 'flutter' | 'both' | 'cms'

export default function StackConfigPage() {
  const t      = useTranslations('stackConfigPage')
  const router = useRouter()

  const { selectedStack, setInstallerValue } = useInstallerStore()

  const [stack,   setStack]   = useState<StackType>(selectedStack || 'both')
  const [loading, setLoading] = useState(false)

  const handleNext = () => {
    setLoading(true)
    setInstallerValue('selectedStack', stack)
    setTimeout(() => {
      router.push('/installer/database')
    }, 200)
  }

  return (
    <InstallerShell step={4} width="sm" logoAlt={t('logoAlt')} tagline={t('tagline')}>
      <div className={CARD}>

        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('description')}</p>

        <RadioGroup
          value={stack}
          onValueChange={(value) => setStack(value as StackType)}
          className="mt-6 gap-3"
        >

          <FieldLabel htmlFor="both">
            <Field orientation="horizontal">
              <RadioGroupItem value="both" id="both" />
              <FieldContent>
                <FieldTitle>{t('stacks.both.title')}</FieldTitle>
                <FieldDescription>{t('stacks.both.description')}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

          <FieldLabel htmlFor="next">
            <Field orientation="horizontal">
              <RadioGroupItem value="next" id="next" />
              <FieldContent>
                <FieldTitle>{t('stacks.next.title')}</FieldTitle>
                <FieldDescription>
                  {/* Translation strings contain controlled inline HTML from our own locale files. */}
                  <span dangerouslySetInnerHTML={{ __html: t.raw('stacks.next.description') }} />
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

          <FieldLabel htmlFor="flutter">
            <Field orientation="horizontal">
              <RadioGroupItem value="flutter" id="flutter" />
              <FieldContent>
                <FieldTitle>{t('stacks.flutter.title')}</FieldTitle>
                <FieldDescription>
                  <span dangerouslySetInnerHTML={{ __html: t.raw('stacks.flutter.description') }} />
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

          <FieldLabel htmlFor="cms">
            <Field orientation="horizontal">
              <RadioGroupItem value="cms" id="cms" />
              <FieldContent>
                <FieldTitle>{t('stacks.cms.title')}</FieldTitle>
                <FieldDescription>{t('stacks.cms.description')}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>

        </RadioGroup>

        <Button
          className={`${PRIMARY_BUTTON} mt-8 w-full`}
          onClick={handleNext}
          disabled={loading}
        >
          {loading
            ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            : t('nextButton')
          }
        </Button>

      </div>
    </InstallerShell>
  )
}