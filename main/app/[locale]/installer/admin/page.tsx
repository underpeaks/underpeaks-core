'use client'

/**
 * AdminSetupPage Component
 *
 * This is the installer wizard step where the user creates the initial
 * administrator account for their Underpeaks system. It is one of the early
 * steps in the setup flow, appearing before the final configuration and
 * installation screens.
 *
 * What this page does:
 * ────────────────────
 * - Renders a centred card form with three fields: Full Name, Email Address,
 *   and Password.
 * - Validates all three fields when the user clicks "Continue":
 *     • Full Name  : must not be empty.
 *     • Email      : must not be empty.
 *     • Password   : must be at least 8 characters, contain at least one
 *                    uppercase letter, and contain at least one special
 *                    character (e.g. !@#$%^&*).
 * - On successful validation:
 *     1. Saves the admin user details (fullName, email, password) to the
 *        global Zustand installer store so later steps can use them.
 *     2. Shows a brief loading spinner for 500 ms.
 *     3. Navigates the user to /installer/config (the next wizard step).
 * - Displays a locale switcher in the top-right corner so the user can
 *   change the app language at any point during setup.
 *
 * Security note:
 * ──────────────
 * The admin password is stored temporarily in the installer store (in memory)
 * so it can be sent to the backend during the install step. It is never
 * written to localStorage, cookies, or logs. The backend is responsible for
 * hashing it before storing it in the database.
 *
 * State managed here:
 *   - fullName      : value of the Full Name input.
 *   - email         : value of the Email Address input.
 *   - password      : value of the Password input.
 *   - showPassword  : toggles the password input between text and password type.
 *   - loading       : true for 500 ms after successful validation, while
 *                     navigating to the next step.
 *   - nameError     : validation error message for the Full Name field.
 *   - emailError    : validation error message for the Email field.
 *   - passError     : validation error message for the Password field.
 */

import { Button }                from '@/components/ui/button'
import { Input }                 from '@/components/ui/input'
import { useRouter }             from 'next/navigation'
import { useState, useCallback } from 'react'
import { useTranslations }       from 'next-intl'
import { useInstallerStore }     from '../../../store/useInstallerStore'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import LocaleSwitcher            from '@/core/LocaleSwitcher'

export default function AdminSetupPage() {
  const t      = useTranslations('adminSetupPage')
  const router = useRouter()

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [fullName,      setFullName]      = useState('')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [showPassword,  setShowPassword]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [nameError,     setNameError]     = useState('')
  const [emailError,    setEmailError]    = useState('')
  const [passError,     setPassError]     = useState('')

  const { setInstallerValue } = useInstallerStore()

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * isValidPassword
   *
   * Checks whether a password meets the minimum security requirements:
   *   - At least 8 characters long.
   *   - Contains at least one uppercase letter (A–Z).
   *   - Contains at least one special character from: ! @ # $ % ^ & * ( ) , .
   *     ? " : { } | < >
   *
   * @param pwd — The password string to validate.
   * @returns   true if all three rules pass, false otherwise.
   */
  const isValidPassword = (pwd: string): boolean => {
    const minLength    = /.{8,}/
    const hasUpperCase = /[A-Z]/
    const hasSymbol    = /[!@#$%^&*(),.?":{}|<>]/
    return minLength.test(pwd) && hasUpperCase.test(pwd) && hasSymbol.test(pwd)
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  /**
   * handleContinue
   *
   * Called when the user clicks the "Continue" button.
   *
   * Steps:
   * 1. Validates all three fields and sets the appropriate error messages.
   *    If any field is invalid, stops here and shows the errors.
   * 2. Sets loading to true to disable the button and show the spinner.
   * 3. Saves { fullName, email, password } to the installer store under the
   *    'adminUser' key so the install step can send them to the backend.
   * 4. After 500 ms, navigates to /installer/config.
   */
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6 py-6">

      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/underpeaks_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      <div className="w-full max-w-md p-8 space-y-6 bg-gray-50 rounded-2xl shadow-xl border">

        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {t('heading')}
        </h2>
        <p className="text-center text-gray-600 text-sm mb-6">
          {t('description')}
        </p>

        <div className="space-y-4 text-left">

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              {t('fields.fullName.label')}
            </label>
            <Input
              id="fullName"
              placeholder={t('fields.fullName.placeholder')}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            {nameError && (
              <p className="text-sm text-red-500 mt-1">{nameError}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('fields.email.label')}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t('fields.email.placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && (
              <p className="text-sm text-red-500 mt-1">{emailError}</p>
            )}
          </div>

          {/* ----------------------------------------------------------------
            * Password Field
            * The eye icon toggles between showing and hiding the password.
            * The input type switches between 'password' and 'text' accordingly.
            * ---------------------------------------------------------------- */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('fields.password.label')}
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('fields.password.placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye    className="w-4 h-4" />
                }
              </button>
            </div>
            {passError && (
              <p className="text-sm text-red-500 mt-1">{passError}</p>
            )}
          </div>

        </div>

        <p className="text-xs text-gray-500 italic text-center mt-2">
          {t('disclaimer')}
        </p>

        <div className="pt-4">
          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              t('continueButton')
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}