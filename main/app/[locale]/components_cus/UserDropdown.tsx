/**
 * UserDropdown.tsx
 * -----------------
 * A dropdown menu component shown in the top navbar when a user is logged in.
 * It displays the user's avatar (or initials), their name and email, their
 * deployment type badge, and a set of navigation and action items.
 *
 * What does this component render?
 * ---------------------------------
 * When the user clicks their avatar in the top navbar, a dropdown appears with:
 *  1. A header section showing the user's avatar, display name, email, and
 *     a badge indicating whether they are on a self-hosted or cloud deployment
 *  2. Navigation links: Account, Settings, Help & Docs
 *  3. A Logout action that clears their session and redirects to sign-in
 *
 * What are the helper functions at the top of this file?
 * -------------------------------------------------------
 * Rather than putting complex logic inside the component, several small
 * pure helper functions are defined above it:
 *  - getUserInitials()      — extracts 1-2 initials from the user's name or email
 *  - getUserDisplayName()   — returns the best available display name
 *  - getAvatarColor()       — picks a consistent background colour for the initials avatar
 *  - formatDeploymentType() — formats the deployment type string for display
 *
 * What is the UserAvatar sub-component?
 * ---------------------------------------
 * UserAvatar is a small component defined in this file that renders either:
 *  - A profile image (if the user has an avatar_url set), or
 *  - A coloured circle with the user's initials (if no avatar is set)
 * It is used twice: once small in the dropdown trigger, once medium in the header.
 *
 * ⚠️  Security rules for this component:
 *   - Never log auth tokens read from localStorage
 *   - Never log raw error objects from the logout flow (may contain session data)
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FiChevronDown, FiLogOut, FiSettings, FiHelpCircle, FiUser } from 'react-icons/fi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { NXFUser, useConsoleStore } from '../../store/consoleStore'

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

/**
 * getUserInitials
 * ----------------
 * Extracts 1–2 uppercase initials from the user's name or email address.
 * These initials are displayed inside the avatar circle when no profile image is set.
 *
 * Logic:
 *  - If the user has a non-empty full_name:
 *      - Two or more words → first letter of first word + first letter of last word
 *        e.g. "Jane Smith" → "JS", "Mary Jane Watson" → "MW"
 *      - Single word → first two characters of that word
 *        e.g. "Madonna" → "MA"
 *  - If no full_name: fall back to the part of the email before the @ symbol,
 *    then take the first two characters
 *    e.g. "jsmith@example.com" → "JS"
 *
 * Note: The fallback from full_name to email happens when full_name is an empty
 * string — name.trim() returns '' which is falsy, so the else branch runs.
 * This is intentional and correct behaviour — do not remove the trim() check.
 *
 * @param user - The logged-in user object
 * @returns     1–2 uppercase characters representing the user's initials
 */
function getUserInitials(user: NXFUser): string {
  // FIX: user.full_name may be undefined/null — default to empty string
  const name: string = user?.full_name ?? ''

  if (name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }

  // Fallback to email prefix if no name is set
  const email = user?.user_email ?? user?.email ?? ''
  return email.split('@')[0].slice(0, 2).toUpperCase() || '?'
}

/**
 * getUserDisplayName
 * -------------------
 * Returns the best available name to display for the user in the dropdown header.
 *
 * Priority order:
 *  1. full_name (if set and non-empty)
 *  2. The part of the email address before the @ symbol
 *  3. The generic fallback string 'User'
 *
 * @param user - The logged-in user object
 * @returns     A non-empty string to display as the user's name
 */
function getUserDisplayName(user: NXFUser): string {
  return user.full_name || user.email?.split('@')[0] || 'User'
}

/**
 * getAvatarColor
 * ---------------
 * Returns a deterministic Tailwind background colour class for the initials avatar.
 * "Deterministic" means the same initials always produce the same colour —
 * so the avatar doesn't randomly change colour on every page load.
 *
 * How does it work?
 * ------------------
 * We add up the character codes of the first and second initial (e.g. 'J' = 74, 'S' = 83)
 * and use the remainder (%) when divided by the number of colours to pick an index.
 * This maps any pair of letters to one consistent colour from the list.
 *
 * @param initials - The 1–2 character initials string (e.g. 'JS', 'MA')
 * @returns          A Tailwind CSS background colour class (e.g. 'bg-violet-500')
 */
function getAvatarColor(initials: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500',  'bg-cyan-500', 'bg-pink-500',    'bg-indigo-500',
  ]
  // charCodeAt(1) may be NaN if initials is only 1 character — we use || 0 as a safe fallback
  return colors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length]
}

/**
 * formatDeploymentType
 * ----------------------
 * Formats the raw deployment_type string from the config for display in the badge.
 * Replaces underscores with hyphens for a cleaner visual presentation.
 *
 * @param type - The raw deployment type string (e.g. 'self_hosted', 'cloud_pro')
 *               May be undefined if config hasn't loaded yet.
 * @returns      A formatted string for display (e.g. 'self-hosted', 'cloud-pro'),
 *               or 'Self-hosted' as the default fallback
 */
function formatDeploymentType(type?: string): string {
  if (!type) return 'Self-hosted'
  return type.replace(/_/g, '-')
}

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENT: UserAvatar
// ─────────────────────────────────────────────────────────────────

/**
 * UserAvatar
 * -----------
 * Renders a user's avatar — either a profile image or an initials circle.
 *
 * If the user has an avatar_url set, we show their profile image.
 * If not, we show a coloured circle containing their initials.
 * The colour of the circle is deterministic — same user always gets the same colour.
 *
 * @param user - The logged-in user object
 * @param size - 'sm' (32×32px, used in the navbar trigger button)
 *               'md' (44×44px, used in the dropdown header)
 */
function UserAvatar({ user, size = 'sm' }: { user: NXFUser; size?: 'sm' | 'md' }) {
  const initials   = getUserInitials(user)
  const colorClass = getAvatarColor(initials)
  const avatarUrl  = user.avatar_url ?? null
  const sizeClass  = size === 'md' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={getUserDisplayName(user)}
        className={`${sizeClass} rounded-full object-cover border border-gray-200 shrink-0`}
      />
    )
  }

  // No avatar image — show the initials circle instead
  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

/**
 * UserDropdown
 * -------------
 * The main dropdown component rendered in the top navbar for logged-in users.
 *
 * @param user - The currently logged-in user. Must be a valid NXFUser object —
 *               this component should only be rendered when a user is confirmed logged in.
 */
export default function UserDropdown({ user }: { user: NXFUser }) {
  const router      = useRouter()
  const t           = useTranslations('userDropdown')

  // resetConsole clears all console-level state from the global store.
  // config holds the current project configuration including deployment_type.
  const { resetConsole, config } = useConsoleStore()

  // Pre-compute the display name once so we don't call the function on every render
  const displayName = getUserDisplayName(user)

  /**
   * handleLogout
   * -------------
   * Handles the logout flow from the user dropdown.
   *
   * Steps:
   *  1. Sends a POST to /api/logout to invalidate the session on the server
   *  2. In the finally block (runs whether the server call succeeded or failed):
   *     - Removes auth tokens from localStorage
   *     - Resets the console store to its initial state
   *     - Redirects the user to /signin
   *
   * Why use finally instead of the try block for cleanup?
   * -------------------------------------------------------
   * The finally block runs regardless of whether an error occurred.
   * This means the user is always logged out locally even if the server request
   * fails — preventing a situation where a network error leaves the user stuck
   * in a logged-in state with an invalid session.
   *
   * ⚠️  The auth token and refreshToken are never logged — they are security credentials.
   */
  const handleLogout = async () => {
    try {
      // Read tokens from localStorage to send to the server for invalidation.
      // ⚠️ Never log these values.
      const token        = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')

      // Ask the server to invalidate this session.
      // Even if this fails, the finally block will still clear local state.
      await fetch('/api/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, refreshToken }),
      })

    } catch {
      // Log that logout failed without exposing the raw error object,
      // which may contain token or session details.
      console.error('UserDropdown: Server-side logout did not complete. Local session will still be cleared.')

    } finally {
      // Always clear local state — regardless of whether the server call succeeded.
      // This ensures the user is always logged out on the current device.
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')

      // Clear the console store so no stale project/user data persists after logout
      resetConsole()

      // Redirect to sign-in page
      router.push('/signin')
    }
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <DropdownMenu>

      {/* ── Trigger Button ── */}
      {/* The clickable element in the navbar that opens the dropdown */}
      <DropdownMenuTrigger
        className="flex items-center gap-2.5 rounded-full bg-gray-100 px-2.5 py-1.5 hover:bg-gray-200 focus:outline-none"
        aria-label={t('aria.userMenu', { name: displayName })}
      >
        <UserAvatar user={user} size="sm" />
        <FiChevronDown className="h-4 w-4 text-gray-500 shrink-0" aria-hidden="true" />
      </DropdownMenuTrigger>

      {/* ── Dropdown Content ── */}
      <DropdownMenuContent
        side="bottom"
        align="end"
        className="w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-0"
      >

        {/* ── Header: User Info ── */}
        {/* Shows the user's avatar, display name, email, and deployment badge */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              {/* Display name — truncated if too long */}
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {displayName}
              </p>
              {/* Email address — truncated if too long */}
              <p className="text-xs text-gray-400 truncate mt-0.5 leading-tight">
                {user.email}
              </p>
            </div>
          </div>

          {/* Deployment type badge — shows 'self-hosted', 'cloud-pro', etc. */}
          <div className="mt-2.5 pt-2.5 border-t border-gray-100">
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
              {formatDeploymentType(config?.deployment_type)}
            </span>
          </div>
        </div>

        {/* ── Menu Items ── */}
        <div className="py-1">

          {/* Account — navigates to the user's account settings page */}
          <Link href="/console/account" className="block">
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50">
              <FiUser size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
              {t('menu.account')}
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />

          {/* Settings — navigates to the console settings overview */}
          <Link href="/console/settings/overview" className="block">
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50">
              <FiSettings size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
              {t('menu.settings')}
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />

          {/* Help & Docs — navigates to the help center */}
          <Link href="/console/help-center" className="block">
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50">
              <FiHelpCircle size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
              {t('menu.helpAndDocs')}
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />

          {/* Logout — triggers the full logout flow */}
          {/* e.preventDefault() stops the dropdown from closing before handleLogout runs */}
          <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-500"
            onSelect={(e) => { e.preventDefault(); handleLogout() }}
          >
            <FiLogOut size={14} className="shrink-0" aria-hidden="true" />
            {t('menu.logout')}
          </DropdownMenuItem>

        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}