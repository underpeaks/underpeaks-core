// packages/nxf-ui/widgets/nxf_accessibility/nxf_exclude_semantics.tsx
import React from 'react';

interface NxfExcludeSemanticsProps {
  children: React.ReactNode;
}

export const NxfExcludeSemantics: React.FC<NxfExcludeSemanticsProps> = ({ children }) => (
  <div aria-hidden="true">{children}</div>
);
