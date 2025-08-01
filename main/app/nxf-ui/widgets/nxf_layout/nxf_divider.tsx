// packages/nxf-ui/widgets/nxf_layouts/nxf_divider.tsx
import React from 'react';

interface NxfDividerProps {
  className?: string;
}

export const NxfDivider: React.FC<NxfDividerProps> = ({ className = '' }) => (
  <hr className={`border-t border-gray-300 my-4 ${className}`} />
);
