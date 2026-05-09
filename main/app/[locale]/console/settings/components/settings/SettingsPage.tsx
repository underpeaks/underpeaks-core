'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiGrid, FiKey, FiMail, FiImage,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';

import OverviewPage from './pages/overViewPage';
import SmtpPage     from './pages/SMTPpage';
import ApiKeysPage  from './pages/ApiKeysPage';
import BrandingPage from './pages/BrandingPage';
import Loader       from '@/app/[locale]/console/Loading';

type NavItem = {
  id:    string;
  label: string;
  icon:  React.ReactNode;
};

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview',      icon: <FiGrid  size={16} /> },
  { id: 'api-keys', label: 'API Keys',      icon: <FiKey   size={16} /> },
  { id: 'smtp',     label: 'SMTP Settings', icon: <FiMail  size={16} /> },
  { id: 'branding', label: 'CMS Branding',  icon: <FiImage size={16} /> },
];

const pages: Record<string, React.ReactNode> = {
  'overview': <OverviewPage />,
  'api-keys': <ApiKeysPage />,
  'smtp':     <SmtpPage />,
  'branding': <BrandingPage />,
};

type Props = { activeId: string };

export default function SettingsPage({ activeId }: Props) {
  const router     = useRouter();
  const active     = pages[activeId] ? activeId : 'overview';
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute inset-0 flex bg-gray-100 overflow-hidden">

      {/* ── Settings nav ── */}
      <aside
        className={`shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-gray-100 flex items-center justify-between px-3 py-4 min-h-[52px]">
          {!collapsed && (
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Settings
            </p>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors ml-auto"
            aria-label="Toggle settings nav"
          >
            {collapsed
              ? <FiChevronRight size={14} />
              : <FiChevronLeft  size={14} />
            }
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/console/settings/${item.id}`)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className={isActive ? 'text-gray-900' : 'text-gray-400'}>
                  {item.icon}
                </span>
                {!collapsed && item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Suspense fallback={<Loader />}>
            {pages[active]}
          </Suspense>
        </div>
      </main>

    </div>
  );
}