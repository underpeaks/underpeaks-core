// packages/nxf-ui/widgets/nxf_selection/nxf_radio.tsx
import React from 'react';

interface NxfRadioProps {
  label: string;
  value: string;
  selectedValue: string;
  onChange: (value: string) => void;
  name: string;
  className?: string;
}

export const NxfRadio: React.FC<NxfRadioProps> = ({
  label,
  value,
  selectedValue,
  onChange,
  name,
  className = '',
}) => (
  <label className={`inline-flex items-center space-x-2 ${className}`}>
    <input
      type="radio"
      value={value}
      checked={selectedValue === value}
      onChange={() => onChange(value)}
      name={name}
      className="form-radio text-blue-600"
    />
    <span>{label}</span>
  </label>
);
