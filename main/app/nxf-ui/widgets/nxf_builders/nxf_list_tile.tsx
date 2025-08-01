// packages/nxf-ui/widgets/nxf_builders/nxf_list_tile.tsx
import React from 'react';

interface NxfListTileProps {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const NxfListTile: React.FC<NxfListTileProps> = ({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  className = '',
}) => (
  <div
    className={`flex items-center justify-between px-4 py-2 hover:bg-gray-100 rounded cursor-pointer ${className}`}
    onClick={onClick}
  >
    {leading && <div className="mr-3">{leading}</div>}
    <div className="flex-1">
      <div className="font-medium">{title}</div>
      {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
    </div>
    {trailing && <div className="ml-3">{trailing}</div>}
  </div>
);
