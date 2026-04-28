'use client';

import { useRouter } from 'next/navigation';
import {
  FiDroplet,
  FiType,
  FiSliders,
  FiToggleLeft,
} from 'react-icons/fi';

import ColoursPage      from './pages/ColoursPage';
import TypographyPage   from './pages/TypographyPage';
import SpacingPage      from './pages/SpacingPage';
import FeatureFlagsPage from './pages/FeatureFlagsPage';

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { id: 'colours',       label: 'Colours',         icon: <FiDroplet size={16} />    },
  { id: 'typography',    label: 'Typography',       icon: <FiType size={16} />       },
  { id: 'spacing',       label: 'Spacing & Radius', icon: <FiSliders size={16} />    },
  { id: 'feature-flags', label: 'Feature Flags',    icon: <FiToggleLeft size={16} /> },
];

const pages: Record<string, React.ReactNode> = {
  'colours':       <ColoursPage />,
  'typography':    <TypographyPage />,
  'spacing':       <SpacingPage />,
  'feature-flags': <FeatureFlagsPage />,
};

type Props = {
  activeId: string;
};

export default function ThemingPage({ activeId }: Props) {
  const router = useRouter();
  const active = pages[activeId] ? activeId : 'colours';

  return (
    <div className="absolute inset-0 flex bg-gray-100 overflow-hidden">

      {/* ── Left nav ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Theming</p>
        </div>
        <nav className="flex-1 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(`/console/themePage/${item.id}`)}
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

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {pages[active]}
        </div>
      </main>

    </div>
  );
}