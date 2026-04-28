'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import 'flag-icons/css/flag-icons.min.css';
import {
  FiLogIn,
  FiUserPlus,
  FiChevronDown,
  FiLogOut,
  FiBell,
  FiMail,
  FiSettings,
  FiCreditCard,
  FiHelpCircle,
  FiUser,
  FiGlobe,
  FiCheck,
} from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { User } from '@supabase/auth-helpers-react';

type TopNavbarProps = {
  user?: User | null;
  logoUrl?: string | null;
  projectName?: string | null;
};

// ── Locales ───────────────────────────────────────────────────────────────────
type Locale = {
  code: string;
  label: string;
  country: string;
};

const locales: Locale[] = [
  { code: 'en',    label: 'English',             country: 'gb' },
  { code: 'en-US', label: 'English (US)',         country: 'us' },
  { code: 'af',    label: 'Afrikaans',            country: 'za' },
  { code: 'fr',    label: 'French',               country: 'fr' },
  { code: 'de',    label: 'German',               country: 'de' },
  { code: 'es',    label: 'Spanish',              country: 'es' },
  { code: 'pt',    label: 'Portuguese',           country: 'pt' },
  { code: 'nl',    label: 'Dutch',                country: 'nl' },
  { code: 'it',    label: 'Italian',              country: 'it' },
  { code: 'zh',    label: 'Chinese (Simplified)', country: 'cn' },
  { code: 'ja',    label: 'Japanese',             country: 'jp' },
  { code: 'ar',    label: 'Arabic',               country: 'sa' },
];

// ── Mock user ─────────────────────────────────────────────────────────────────
const MOCK_USER = {
  id: 'mock-001',
  email: 'anton@her.co.za',
  user_metadata: {
    full_name: 'Anton Wentzel',
    avatar_url: null,
  },
} as unknown as User;

// ── Demo data ─────────────────────────────────────────────────────────────────
const demoNotifications = [
  { id: 1, title: 'Deployment Successful', description: 'Your project was deployed successfully.', time: '2 min ago',  read: false },
  { id: 2, title: 'New User Registered',   description: 'anton@her.co.za just signed up.',         time: '15 min ago', read: false },
  { id: 3, title: 'Config Updated',        description: 'System config was updated by admin.',      time: '1 hour ago', read: true  },
];

const demoMessages = [
  { id: 1, from: 'Anton Wentzel', avatar: 'AW', subject: 'Project Kickoff',                  preview: 'Hey, are we still on for the project kickoff tomorrow?',                                          time: '5 min ago',  read: false },
  { id: 2, from: 'NXT Support',   avatar: 'NS', subject: 'Welcome to NXTFlutter',             preview: 'Thanks for setting up your project. Let us know if you need help.',                               time: '1 hour ago', read: false },
  { id: 3, from: 'System',        avatar: 'SY', subject: 'Scheduled Maintenance',             preview: 'Maintenance is scheduled for Sunday 2am - 4am UTC.',                                             time: 'Yesterday',  read: true  },
  { id: 4, from: 'System',        avatar: 'SY', subject: 'Scheduled Maintenance Rescheduled', preview: 'Maintenance rescheduled from Sunday 2am - 4am UTC. We will notify again shortly.',               time: 'Yesterday',  read: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getUserInitials(user: User): string {
  const name: string = user.user_metadata?.full_name || user.user_metadata?.name || '';
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (user.email?.split('@')[0] || '').slice(0, 2).toUpperCase();
}

function getUserDisplayName(user: User): string {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  );
}

function getAvatarColor(initials: string): string {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
    'bg-amber-500',  'bg-cyan-500', 'bg-pink-500',    'bg-indigo-500',
  ];
  return colors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length];
}

function UserAvatar({ user, size = 'sm' }: { user: User; size?: 'sm' | 'md' }) {
  const initials   = getUserInitials(user);
  const colorClass = getAvatarColor(initials);
  const avatarUrl  = user.user_metadata?.avatar_url ?? null;
  const sizeClass  = size === 'md' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={getUserDisplayName(user)}
        className={`${sizeClass} rounded-full object-cover border border-gray-200 shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  );
}

// ── Flag component ────────────────────────────────────────────────────────────
function Flag({ country, className = '' }: { country: string; className?: string }) {
  return (
    <span
      className={`fi fi-${country} rounded-sm shrink-0 ${className}`}
      style={{ width: 20, height: 15, display: 'inline-block' }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TopNavbar({ user: propUser, logoUrl, projectName }: TopNavbarProps) {
  const router = useRouter();
  const [mounted,      setMounted]      = useState(false);
  const [activeLocale, setActiveLocale] = useState<Locale>(locales[0]);
  const [localeSearch, setLocaleSearch] = useState('');

  const handleLogout = async () => {
    router.push('/');
    router.refresh();
  };

  // Mock user — replace with `propUser ?? localUser` in production
  const user: User | null = MOCK_USER;

  const unreadNotifications = demoNotifications.filter((n) => !n.read).length;
  const unreadMessages      = demoMessages.filter((m) => !m.read).length;

  const filteredLocales = locales.filter(
    (l) =>
      l.label.toLowerCase().includes(localeSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(localeSearch.toLowerCase())
  );

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="h-16 bg-white" />;

  const displayName = user ? getUserDisplayName(user) : '';

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md border-b border-gray-200 z-50">
      <div className="container mx-auto flex items-center justify-between px-6 h-full">

        {/* ── Logo + project name ── */}
        <Link href="/console/dashboard" className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <span className="text-black text-xl font-semibold">NextFlutter</span>
          )}
          {projectName && (
            <>
              <Separator orientation="vertical" className="h-5 bg-gray-300" />
              <div className="flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 bg-gray-50 shadow-inner">
                <span className="text-xs font-normal text-gray-400">Project:</span>
                <span className="text-base font-semibold text-gray-700">{projectName}</span>
              </div>
            </>
          )}
        </Link>

        {/* ── Right area ── */}
        <div className="flex items-center gap-2">

          {/* ===== LOCALISATION ===== */}
          <DropdownMenu onOpenChange={(open) => { if (!open) setLocaleSearch(''); }}>
            <DropdownMenuTrigger className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none transition-colors">
              <FiGlobe size={15} className="text-gray-600 shrink-0" />
              <Flag country={activeLocale.country} />
              <span className="text-xs font-semibold text-gray-700 hidden sm:block">
                {activeLocale.code.toUpperCase()}
              </span>
              <FiChevronDown size={13} className="text-gray-500 shrink-0" />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="bottom"
              align="end"
              className="w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-0"
            >
              {/* Header + search */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">CMS Language</p>
                <input
                  value={localeSearch}
                  onChange={(e) => setLocaleSearch(e.target.value)}
                  placeholder="Search language…"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                />
              </div>

              {/* Locale list */}
              <div className="max-h-64 overflow-y-auto py-1">
                {filteredLocales.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No languages found</p>
                ) : (
                  filteredLocales.map((locale) => (
                    <div
                      key={locale.code}
                      onClick={() => {
                        setActiveLocale(locale);
                        setLocaleSearch('');
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                        activeLocale.code === locale.code ? 'bg-gray-50' : ''
                      }`}
                    >
                      <Flag country={locale.country} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 font-medium truncate">{locale.label}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{locale.code}</p>
                      </div>
                      {activeLocale.code === locale.code && (
                        <FiCheck size={13} className="text-gray-800 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer note */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  This sets the CMS interface language. App localisation is managed under{' '}
                  <span className="font-semibold text-gray-600">Theming → Feature Flags</span>.
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" />

          {/* ===== NOTIFICATIONS ===== */}
          <DropdownMenu>
            <DropdownMenuTrigger className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
              <FiBell size={18} className="text-gray-600" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
                  <span className="text-[10px] font-bold text-white leading-none">{unreadNotifications}</span>
                </span>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="end" className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg p-0">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
                <span className="text-xs text-gray-400">{unreadNotifications} unread</span>
              </div>
              <DropdownMenuSeparator />
              {demoNotifications.map((n, i) => (
                <div key={n.id}>
                  <div className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!n.read ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className={`text-sm ${!n.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.description}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{n.time}</span>
                    </div>
                  </div>
                  {i < demoNotifications.length - 1 && <DropdownMenuSeparator />}
                </div>
              ))}
              <DropdownMenuSeparator />
              <div className="px-4 py-2 text-center">
                <span className="text-xs text-blue-500 cursor-pointer hover:underline">View all notifications</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ===== MESSAGES ===== */}
          <DropdownMenu>
            <DropdownMenuTrigger className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none">
              <FiMail size={18} className="text-gray-600" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1">
                  <span className="text-[10px] font-bold text-white leading-none">{unreadMessages}</span>
                </span>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="end" className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg p-0">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Messages</span>
                <span className="text-xs text-gray-400">{unreadMessages} unread</span>
              </div>
              <DropdownMenuSeparator />
              {demoMessages.map((m, i) => (
                <div key={m.id}>
                  <div className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!m.read ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-semibold shrink-0">
                        {m.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm ${!m.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-600'}`}>
                            {m.from}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{m.time}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{m.subject}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{m.preview}</p>
                      </div>
                    </div>
                  </div>
                  {i < demoMessages.length - 1 && <DropdownMenuSeparator />}
                </div>
              ))}
              <DropdownMenuSeparator />
              <div className="px-4 py-2 text-center">
                <span className="text-xs text-blue-500 cursor-pointer hover:underline">View all messages</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 bg-gray-200 mx-1" />

          {/* ===== USER DROPDOWN ===== */}
          {user ? (
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
                      Self-hosted
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">

                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
                    onSelect={() => router.push('/account')}
                  >
                    <FiUser size={14} className="text-gray-400 shrink-0" /> Account
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
                    onSelect={() => router.push('/console/settings/overview')}
                  >
                    <FiSettings size={14} className="text-gray-400 shrink-0" /> Settings
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
                    onSelect={() => router.push('/billing')}
                  >
                    <FiCreditCard size={14} className="text-gray-400 shrink-0" /> Billing
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
                    onSelect={() => router.push('/docs')}
                  >
                    <FiHelpCircle size={14} className="text-gray-400 shrink-0" /> Help &amp; Docs
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-500"
                    onSelect={(e) => { e.preventDefault(); handleLogout(); }}
                  >
                    <FiLogOut size={14} className="shrink-0" /> Logout
                  </DropdownMenuItem>

                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex space-x-3 items-center">
              <Link href="/signin" className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition">
                <FiLogIn size={16} /> Sign In
              </Link>
              <Link href="/signup" className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-100 transition">
                <FiUserPlus size={16} /> Register
              </Link>
            </div>
          )}

        </div>
      </div>
    </nav>
  );
}