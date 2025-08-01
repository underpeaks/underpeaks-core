// packages/nxf-ui/widgets/nxf_selection/nxf_date_picker.tsx
import React from 'react';

interface NxfDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const NxfDatePicker: React.FC<NxfDatePickerProps> = ({ value, onChange, className = '' }) => (
  <input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`border px-3 py-2 rounded w-full ${className}`}
  />
);
