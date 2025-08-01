// packages/nxf-ui/widgets/nxf_form_helpers/nxf_form.tsx
// packages/nxf-ui/widgets/nxf_form/nxf_form.tsx
import React from 'react';

interface NxfFormProps {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  className?: string;
}

export const NxfForm: React.FC<NxfFormProps> = ({
  onSubmit,
  children,
  className = '',
}) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      if (onSubmit) onSubmit(e);
    }}
    className={className}
  >
    {children}
  </form>
);
