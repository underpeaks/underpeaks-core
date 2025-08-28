// packages/nxf-ui/widgets/nxf_selection/nxf_chip.tsx
import React from 'react';

interface NxfChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const NxfChip: React.FC<NxfChipProps> = ({
  label,
  selected = false,
  onClick,
  className = '',
}) => (
  <span
    onClick={onClick}
    className={`inline-block px-3 py-1 rounded-full border text-sm cursor-pointer ${
      selected ? 'bg-blue-100 text-blue-600 border-blue-500' : 'bg-gray-100 text-gray-700 border-gray-300'
    } ${className}`}
  >
    {label}
  </span>
);
