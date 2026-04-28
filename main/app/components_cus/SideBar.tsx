'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { menuSections } from './MenuItems';
import {
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiSettings,
  FiChevronDown,
  FiChevronRight as FiChevronRightSmall,
} from 'react-icons/fi';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () =>
      menuSections.reduce((acc, section) => {
        acc[section.title] = false;
        return acc;
      }, {} as Record<string, boolean>)
  );

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const token = localStorage.getItem('authToken');
      const refreshToken = localStorage.getItem('refreshToken');

      const res = await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, refreshToken }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.warn('Logout failed:', data.error);
      } else {
        console.log('✅ Logout successful:', data.message);
      }

      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');

      if (process.env.NEXT_PUBLIC_DB_TYPE === 'firebase') {
        try {
          const { getApps, initializeApp } = await import('firebase/app');
          const { getAuth, signOut } = await import('firebase/auth');

          const firebaseConfig = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG!);
          const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
          const auth = getAuth(app);
          await signOut(auth);
        } catch (err) {
          console.warn('Firebase logout skipped:', err);
        }
      }

      await new Promise((r) => setTimeout(r, 400));

      router.push('/signin');
    } catch (err) {
      console.error('Logout failed:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={`fixed top-16 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-width duration-300 ${
        collapsed ? 'w-25' : 'w-64'
      }`}
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 flex items-center justify-between p-6 min-h-[60px]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto mt-2">
        {menuSections.map((section) => {
          const isExpanded = expandedSections[section.title];

          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase hover:bg-gray-100"
                >
                  <span>{section.title}</span>
                  {isExpanded ? (
                    <FiChevronDown size={14} />
                  ) : (
                    <FiChevronRightSmall size={14} />
                  )}
                </button>
              )}

              <div
                className={`flex flex-col ${
                  collapsed ? 'block' : isExpanded ? 'block' : 'hidden'
                }`}
              >
                {section.items.map((item) => {
                  const isActive = pathname === item.path;

                  return (
                    <Link
                      key={item.label}
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded transition-colors hover:bg-gray-100 text-xs ${
                        isActive
                          ? 'bg-gray-200 font-semibold text-gray-900'
                          : 'text-gray-700'
                      } ${collapsed ? 'justify-center' : ''}`}
                      title={collapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 bg-white border-t border-gray-200 p-4 flex justify-between px-3 items-center">
        <Link
          href="/console/settings"
          title="Settings"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
        >
          <FiSettings size={16} />
        </Link>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Logout"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 transition-colors text-gray-600 disabled:opacity-50"
        >
          <FiLogOut size={16} />
        </button>
      </div>

      {/* BLOCKING LOGOUT OVERLAY */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
            <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
            <div className="text-sm font-medium text-gray-800">Logging out…</div>
          </div>
        </div>
      )}
    </aside>
  );
}