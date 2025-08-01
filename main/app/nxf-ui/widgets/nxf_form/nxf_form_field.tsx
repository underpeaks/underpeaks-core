// packages/nxf-ui/widgets/nxf_form_helpers/nxf_form_field.tsx
import React from 'react';

interface NxfFormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const NxfFormField: React.FC<NxfFormFieldProps> = ({
  label,
  error,
  children,
  className = '',
}) => (
  <div className={`mb-4 ${className}`}>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);
