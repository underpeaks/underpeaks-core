'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    () =>
      menuSections.reduce((acc, section) => {
        acc[section.title] = false;
        return acc;
      }, {} as Record<string, boolean>)
  );

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside
      className={`fixed top-16 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-width duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Fixed Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 flex items-center justify-between p-4 min-h-[60px]">
        {!collapsed && <div className="text-lg font-bold text-gray-900">NextFlutter</div>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
          className="hover:bg-gray-100 p-2 rounded"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      {/* Scrollable Menu */}
      <nav className="flex-1 overflow-y-auto mt-2">
        {menuSections.map((section) => {
          const isExpanded = expandedSections[section.title];

          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase hover:bg-gray-100 focus:outline-none"
                  title={section.title}
                >
                  <span>{section.title}</span>
                  {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRightSmall size={14} />}
                </button>
              )}

              <div className={`flex flex-col ${collapsed ? 'block' : isExpanded ? 'block' : 'hidden'}`}>
                {section.items.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.label}
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded transition-colors hover:bg-gray-100 text-xs ${
                        isActive ? 'bg-gray-200 font-semibold text-gray-900' : 'text-gray-700'
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

      {/* Fixed Footer */}
      <div className="shrink-0 bg-white border-t border-gray-200 p-4 flex justify-around">
        <Link href="/console/settings" className="hover:bg-gray-100 p-2 rounded" title="Settings">
          <FiSettings size={18} />
        </Link>
        <button
          onClick={() => console.log('Logout')}
          className="hover:bg-gray-100 p-2 rounded"
          title="Logout"
        >
          <FiLogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
