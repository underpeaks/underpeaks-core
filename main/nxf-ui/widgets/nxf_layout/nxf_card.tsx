// packages/nxf-ui/widgets/nxf_layouts/nxf_card.tsx
import React from 'react';

interface NxfCardProps {
  children: React.ReactNode;
  className?: string;
}

export const NxfCard: React.FC<NxfCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      {children}
    </div>
  );
};
