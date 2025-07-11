// packages/nxf-ui/widgets/nxf_selection/nxf_checkbox.tsx
import React from 'react';

interface NxfCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export const NxfCheckbox: React.FC<NxfCheckboxProps> = ({
  label,
  checked,
  onChange,
  className = '',
}) => (
  <label className={`inline-flex items-center space-x-2 ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="form-checkbox text-blue-600"
    />
    <span>{label}</span>
  </label>
);
