// packages/nxf-ui/widgets/nxf_accessibility/nxf_merge_semantics.tsx
import React from 'react';

interface NxfMergeSemanticsProps {
  label: string;
  children: React.ReactNode;
}

export const NxfMergeSemantics: React.FC<NxfMergeSemanticsProps> = ({ label, children }) => (
  <div aria-label={label} role="group">
    {children}
  </div>
);
