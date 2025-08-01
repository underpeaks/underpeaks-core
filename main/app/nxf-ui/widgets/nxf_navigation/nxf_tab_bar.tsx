// packages/nxf-ui/widgets/nxf_navigation/nxf_tab_bar.tsx
import React from 'react';

interface TabItem {
  label: string;
  onClick: () => void;
}

interface NxfTabBarProps {
  items: TabItem[];
  activeIndex: number;
  className?: string;
}

export const NxfTabBar: React.FC<NxfTabBarProps> = ({
  items,
  activeIndex,
  className = '',
}) => (
  <div className={`flex space-x-4 border-b ${className}`}>
    {items.map((item, index) => (
      <button
        key={index}
        onClick={item.onClick}
        className={`py-2 px-4 font-medium ${
          activeIndex === index ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
);
