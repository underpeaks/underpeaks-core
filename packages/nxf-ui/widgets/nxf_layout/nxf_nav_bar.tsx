// packages/nxf-ui/widgets/nxf_layouts/nxf_nav_bar.tsx
import React from 'react';

interface NxfNavBarProps {
  items: { label: string; href: string }[];
  className?: string;
}

export const NxfNavBar: React.FC<NxfNavBarProps> = ({ items, className = '' }) => (
  <nav className={`flex space-x-4 bg-white shadow px-4 py-3 ${className}`}>
    {items.map((item) => (
      <a key={item.href} href={item.href} className="text-gray-700 hover:text-blue-600">
        {item.label}
      </a>
    ))}
  </nav>
);
