// packages/nxf-ui/widgets/nxf_accessibility/nxf_semantics.tsx
import React from 'react';

interface NxfSemanticsProps {
  label: string;
  role?: string;
  children: React.ReactNode;
}

export const NxfSemantics: React.FC<NxfSemanticsProps> = ({ label, role = 'region', children }) => (
  <div role={role} aria-label={label}>
    {children}
  </div>
);
