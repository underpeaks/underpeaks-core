// packages/nxf-ui/widgets/nxf_form_helpers/nxf_form.tsx
import React from 'react';

interface NxfFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  className?: string;
}

export const NxfForm: React.FC<NxfFormProps> = ({ onSubmit, children, className = '' }) => (
  <form onSubmit={onSubmit} className={className}>
    {children}
  </form>
);
