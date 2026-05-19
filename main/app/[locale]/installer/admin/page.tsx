'use client'

/**
 * AdminSetupPage Component
 *
 * This is the installer wizard step where the user creates the initial
 * administrator account for their NXT_Flutter system. It is one of the early
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
 *   - fullName   : value of the Full Name input.
 *   - email      : value of the Email Address input.
 *   - password   : value of the Password input.
 *   - loading    : true for 500 ms after successful validation, while
 *                  navigating to the next step.
 *   - nameError  : validation error message for the Full Name field.
 *   - emailError : validation error message for the Email field.
 *   - passError  : validation error message for the Password field.
 */

import { Button }              from '@/components/ui/button'
import { Input }               from '@/components/ui/input'
import { useRouter }           from 'next/navigation'
import { useState, useCallback } from 'react'
import { useTranslations }     from 'next-intl'
import { useInstallerStore }   from '../../../store/useInstallerStore'
import { Loader2 }             from 'lucide-react'
import LocaleSwitcher          from '@/core/LocaleSwitcher'

/**
 * AdminSetupPage
 *
 * The installer wizard step for creating the initial admin account.
 * See the file-level JSDoc above for a full description.
 */
export default function AdminSetupPage() {
  /**
   * t — Translation function scoped to the 'adminSetupPage' namespace.
   * Call t('some.key') to get the translated string for that key.
   */
  const t = useTranslations('adminSetupPage')

  /** Next.js router — used to navigate to /installer/config after validation. */
  const router = useRouter()

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  /** Current value of the Full Name input field. */
  const [fullName,   setFullName]   = useState('')

  /** Current value of the Email Address input field. */
  const [email,      setEmail]      = useState('')

  /** Current value of the Password input field. */
  const [password,   setPassword]   = useState('')

  /**
   * True for 500 ms after the user passes validation, while the app saves
   * their details to the store and navigates to the next step.
   * Disables the Continue button and shows a spinner to prevent double-clicks.
   */
  const [loading,    setLoading]    = useState(false)

  /** Validation error message for the Full Name field. Empty string = no error. */
  const [nameError,  setNameError]  = useState('')

  /** Validation error message for the Email field. Empty string = no error. */
  const [emailError, setEmailError] = useState('')

  /** Validation error message for the Password field. Empty string = no error. */
  const [passError,  setPassError]  = useState('')

  /** setInstallerValue — Zustand action to write a single key into the installer store. */
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
   *
   * Example:
   *   isValidPassword('hello')       // false — too short, no uppercase, no symbol
   *   isValidPassword('Hello123!')   // true
   */
  const isValidPassword = (pwd: string): boolean => {
    const minLength   = /.{8,}/
    const hasUpperCase = /[A-Z]/
    const hasSymbol   = /[!@#$%^&*(),.?":{}|<>]/
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
   * 4. After 500 ms (to allow the spinner to render), navigates to
   *    /installer/config — the next step in the wizard.
   *
   * Wrapped in useCallback so the function reference is stable across renders,
   * avoiding unnecessary re-creation when unrelated state changes.
   */
  const handleContinue = useCallback(() => {
    let hasError = false

    // Validate Full Name — must not be blank
    if (!fullName.trim()) {
      setNameError(t('errors.nameRequired'))
      hasError = true
    } else {
      setNameError('')
    }

    // Validate Email — must not be blank
    if (!email.trim()) {
      setEmailError(t('errors.emailRequired'))
      hasError = true
    } else {
      setEmailError('')
    }

    // Validate Password — must meet the minimum security requirements
    if (!password.trim() || !isValidPassword(password)) {
      setPassError(t('errors.passwordInvalid'))
      hasError = true
    } else {
      setPassError('')
    }

    // At least one field failed — show the errors and stop here
    if (hasError) return

    // All fields are valid — save to store and navigate to the next step
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

      {/* ----------------------------------------------------------------
        * Locale Switcher
        * Fixed to the top-right corner so the user can change language at
        * any point during the installer flow without losing their progress.
        * ---------------------------------------------------------------- */}
      <div className="fixed top-4 right-4 z-50">
        <LocaleSwitcher />
      </div>

      {/* ----------------------------------------------------------------
        * Page Header — Logo and tagline
        * ---------------------------------------------------------------- */}
      <header className="mb-8 text-center flex flex-col items-center">
        <img
          src="/images/logo/NXT_Flutter_logo.png"
          alt={t('logoAlt')}
          className="h-16 w-auto mb-4"
        />
        <p className="text-xl text-gray-700">{t('tagline')}</p>
      </header>

      {/* ----------------------------------------------------------------
        * Setup Card
        * Centred form card containing the three admin account fields.
        * ---------------------------------------------------------------- */}
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-50 rounded-2xl shadow-xl border">

        {/* Card title and description */}
        <h2 className="text-3xl font-bold text-gray-900 text-center">
          {t('heading')}
        </h2>
        <p className="text-center text-gray-600 text-sm mb-6">
          {t('description')}
        </p>

        {/* ----------------------------------------------------------------
          * Form Fields
          * Each field has a label, an input, and a conditional error message
          * shown in red beneath the input when validation fails.
          * ---------------------------------------------------------------- */}
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
            {/* Validation error — only rendered when nameError is non-empty */}
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
            {/* Validation error — only rendered when emailError is non-empty */}
            {emailError && (
              <p className="text-sm text-red-500 mt-1">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              {t('fields.password.label')}
            </label>
            <Input
              id="password"
              type="password"
              placeholder={t('fields.password.placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* Validation error — only rendered when passError is non-empty */}
            {passError && (
              <p className="text-sm text-red-500 mt-1">{passError}</p>
            )}
          </div>

        </div>

        {/* Disclaimer note — clarifies that this is a system account, not a DB account */}
        <p className="text-xs text-gray-500 italic text-center mt-2">
          {t('disclaimer')}
        </p>

        {/* ----------------------------------------------------------------
          * Continue Button
          * Disabled while loading. Shows a spinner icon while the app saves
          * the admin details and transitions to the next wizard step.
          * ---------------------------------------------------------------- */}
        <div className="pt-4">
          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={loading}
          >
            {loading ? (
              // Spinner shown while navigating to the next step
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