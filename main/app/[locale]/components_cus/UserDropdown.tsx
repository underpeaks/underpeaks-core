'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiChevronDown, FiLogOut, FiSettings, FiHelpCircle, FiUser } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { NXFUser } from '../../store/consoleStore';
import { useConsoleStore } from '../../store/consoleStore';

function getUserInitials(user: NXFUser): string {
  const name: string = user.full_name
  if (name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (user.email?.split('@')[0] || '').slice(0, 2).toUpperCase()
}

function getUserDisplayName(user: NXFUser): string {
  return user.full_name || user.email?.split('@')[0] || 'User'
}

function getAvatarColor(initials: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500',  'bg-cyan-500', 'bg-pink-500',    'bg-indigo-500',
  ]
  return colors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length]
}
function formatDeploymentType(type?: string): string {
  if (!type) return 'Self-hosted'
  return type.replace(/_/g, '-')
}

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

  return (
    <div className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  )
}

export default function UserDropdown({ user }: { user: NXFUser }) {
  const router       = useRouter()
 const { resetConsole, config } = useConsoleStore()
  const displayName  = getUserDisplayName(user)

  const handleLogout = async () => {
    try {
      const token        = localStorage.getItem('authToken')
      const refreshToken = localStorage.getItem('refreshToken')

      await fetch('/api/logout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, refreshToken }),
      })
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      resetConsole()
      router.push('/signin')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2.5 rounded-full bg-gray-100 px-2.5 py-1.5 hover:bg-gray-200 focus:outline-none"
        aria-label="User menu"
      >
        <UserAvatar user={user} size="sm" />
        <FiChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="end" className="w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-0">

        {/* User info header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{displayName}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5 leading-tight">{user.email}</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2.5 border-t border-gray-100">
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
  {formatDeploymentType(config?.deployment_type)}
</span>
          </div>
        </div>

        {/* Menu items */}
        <div className="py-1">
          <Link href="/console/account" className="block">
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50">
              <FiUser size={14} className="text-gray-400 shrink-0" /> Account
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />

          <Link href="/console/settings/overview" className="block">
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50">
              <FiSettings size={14} className="text-gray-400 shrink-0" /> Settings
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />

          <Link href="/console/help-center" className="block">
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50">
              <FiHelpCircle size={14} className="text-gray-400 shrink-0" /> Help &amp; Docs
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-500"
            onSelect={(e) => { e.preventDefault(); handleLogout() }}
          >
            <FiLogOut size={14} className="shrink-0" /> Logout
          </DropdownMenuItem>
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}