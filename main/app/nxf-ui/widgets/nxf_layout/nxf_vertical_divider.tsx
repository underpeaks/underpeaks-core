// packages/nxf-ui/widgets/nxf_layouts/nxf_vertical_divider.tsx
import React from 'react';

interface NxfVerticalDividerProps {
  className?: string;
  height?: string;
}

export const NxfVerticalDivider: React.FC<NxfVerticalDividerProps> = ({
  className = '',
  height = 'h-full',
}) => (
  <div className={`border-l border-gray-300 mx-2 ${height} ${className}`} />
);
