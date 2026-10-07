// AdminSetupPage.tsx  (installer step 3: administrator account)
'use client'

import { Button }                from '@/components/ui/button'
import { Input }                 from '@/components/ui/input'
import { Label }                 from '@/components/ui/label'
import { useRouter }             from 'next/navigation'
import { useState, useCallback } from 'react'
import { useTranslations }       from 'next-intl'
import { useInstallerStore }     from '../../../store/useInstallerStore'
import { Loader2, Eye, EyeOff }  from 'lucide-react'
import InstallerShell, { CARD, PRIMARY_BUTTON, INPUT_CLASS } from '@/core/InstallerShell'

export default function AdminSetupPage() {
  const t      = useTranslations('adminSetupPage')
  const router = useRouter()

  const [fullName,     setFullName]     = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [nameError,    setNameError]    = useState('')
  const [emailError,   setEmailError]   = useState('')
  const [passError,    setPassError]    = useState('')

  const { setInstallerValue } = useInstallerStore()

  /** At least 8 characters, one uppercase letter and one special character. */
  const isValidPassword = (pwd: string): boolean => {
    const minLength    = /.{8,}/
    const hasUpperCase = /[A-Z]/
    const hasSymbol    = /[!@#$%^&*(),.?":{}|<>]/
    return minLength.test(pwd) && hasUpperCase.test(pwd) && hasSymbol.test(pwd)
  }

  const handleContinue = useCallback(() => {
    let hasError = false

    if (!fullName.trim()) {
      setNameError(t('errors.nameRequired'))
      hasError = true
    } else {
      setNameError('')
    }

    if (!email.trim()) {
      setEmailError(t('errors.emailRequired'))
      hasError = true
    } else {
      setEmailError('')
    }

    if (!password.trim() || !isValidPassword(password)) {
      setPassError(t('errors.passwordInvalid'))
      hasError = true
    } else {
      setPassError('')
    }

    if (hasError) return

    setLoading(true)
    setInstallerValue('adminUser', { fullName, email, password })

    setTimeout(() => {
      router.push('/installer/config')
    }, 500)
  }, [fullName, email, password, setInstallerValue, router, t])

  return (
    <InstallerShell step={3} width="sm" logoAlt={t('logoAlt')} tagline={t('tagline')}>
      <div className={CARD}>

        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('description')}</p>

        <div className="mt-6 space-y-5">

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium text-neutral-800">
              {t('fields.fullName.label')}
            </Label>
            <Input
              id="fullName"
              placeholder={t('fields.fullName.placeholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`${INPUT_CLASS} ${nameError ? 'border-red-500' : ''}`}
            />
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-neutral-800">
              {t('fields.email.label')}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t('fields.email.placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${INPUT_CLASS} ${emailError ? 'border-red-500' : ''}`}
            />
            {emailError && <p className="text-xs text-red-600">{emailError}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-neutral-800">
              {t('fields.password.label')}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('fields.password.placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASS} pr-10 ${passError ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-neutral-400 hover:text-neutral-700"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye    className="h-4 w-4" />
                }
              </button>
            </div>
            {passError && <p className="text-xs text-red-600">{passError}</p>}
          </div>

        </div>

        <p className="mt-5 rounded-lg bg-neutral-100 px-3 py-2 text-center text-xs text-neutral-500">
          {t('disclaimer')}
        </p>

        <Button
          className={`${PRIMARY_BUTTON} mt-6 w-full`}
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