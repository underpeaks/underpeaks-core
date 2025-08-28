// packages/nxf-ui/widgets/nxf_navigation/nxf_nav_rail.tsx
import React from 'react';

interface NxfNavRailProps {
  items: { icon: React.ReactNode; label: string; onClick: () => void }[];
  selectedIndex: number;
}

export const NxfNavRail: React.FC<NxfNavRailProps> = ({ items, selectedIndex }) => {
  return (
    <div className="flex flex-col items-center w-16 bg-white shadow h-screen py-4">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          className={`flex flex-col items-center text-xs p-2 rounded ${
            selectedIndex === index ? 'text-blue-600 bg-gray-100' : 'text-gray-500'
          }`}
        >
          {item.icon}
          <span className="mt-1">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
