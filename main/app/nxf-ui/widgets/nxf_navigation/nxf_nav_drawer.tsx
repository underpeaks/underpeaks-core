// packages/nxf-ui/widgets/nxf_navigation/nxf_nav_drawer.tsx
import React from 'react';

interface DrawerItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface NxfNavDrawerProps {
  open: boolean;
  items: DrawerItem[];
  onClose: () => void;
}

export const NxfNavDrawer: React.FC<NxfNavDrawerProps> = ({ open, items, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="bg-white w-64 h-full shadow-lg p-4">
        <button className="mb-4 text-sm text-gray-500" onClick={onClose}>
          Close
        </button>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
              onClick={item.onClick}
            >
              {item.icon}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 bg-black bg-opacity-40" onClick={onClose} />
    </div>
  );
};
