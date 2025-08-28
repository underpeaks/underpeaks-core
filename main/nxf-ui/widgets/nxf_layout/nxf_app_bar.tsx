// packages/nxf-ui/widgets/nxf_layouts/nxf_app_bar.tsx
import React from 'react';

interface NxfAppBarProps {
  title: string;
  rightActions?: React.ReactNode;
  className?: string;
}

export const NxfAppBar: React.FC<NxfAppBarProps> = ({ title, rightActions, className = '' }) => {
  return (
    <header className={`flex items-center justify-between bg-white px-4 py-3 shadow ${className}`}>
      <h1 className="text-lg font-semibold">{title}</h1>
      <div>{rightActions}</div>
    </header>
  );
};
