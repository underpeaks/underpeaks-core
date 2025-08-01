// packages/nxf-ui/widgets/nxf_wrapping/nxf_badge.tsx
import React from 'react';

interface NxfBadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export const NxfBadge: React.FC<NxfBadgeProps> = ({
  label,
  color = 'bg-blue-600',
  className = '',
}) => {
  return (
    <span
      className={`inline-block text-xs font-semibold text-white px-2 py-1 rounded ${color} ${className}`}
    >
      {label}
    </span>
  );
};
