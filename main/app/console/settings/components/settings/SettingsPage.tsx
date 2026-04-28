'use client';

import { useRouter } from 'next/navigation';
import {
  FiGrid, FiKey, FiMail,
  FiGlobe, FiImage,
} from 'react-icons/fi';
import OverviewPage  from './pages/overViewPage';
import SmtpPage      from './pages/SMTPpage';
import DomainsPage   from './pages/DomainPage';
import ApiKeysPage   from './pages/ApiKeysPage';
import BrandingPage  from './pages/BrandingPage';

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview',     icon: <FiGrid size={16} />  },
  { id: 'api-keys', label: 'API Keys',      icon: <FiKey size={16} />   },
  { id: 'smtp',     label: 'SMTP Settings', icon: <FiMail size={16} />  },
  { id: 'domains',  label: 'Domains',       icon: <FiGlobe size={16} /> },
  { id: 'branding', label: 'CMS Branding',  icon: <FiImage size={16} /> },
];

const pages: Record<string, React.ReactNode> = {
  'overview': <OverviewPage />,
  'api-keys': <ApiKeysPage />,
  'smtp':     <SmtpPage />,
  'domains':  <DomainsPage />,
  'branding': <BrandingPage />,
};

type Props = {
  activeId: string;
};

export default function SettingsPage({ activeId }: Props) {
  const router = useRouter();
  const active = pages[activeId] ? activeId : 'overview';

  return (
    <div className="absolute inset-0 flex bg-gray-100 overflow-hidden">

      {/* ── Settings nav ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Settings</p>
        </div>
        <nav className="flex-1 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(`/console/settings/${item.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                active === item.id
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className={active === item.id ? 'text-gray-900' : 'text-gray-400'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Content area ── */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {pages[active]}
        </div>
      </main>

    </div>
  );
}