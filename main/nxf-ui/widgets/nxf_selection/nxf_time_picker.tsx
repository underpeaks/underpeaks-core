// packages/nxf-ui/widgets/nxf_selection/nxf_time_picker.tsx
import React from 'react';

interface NxfTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const NxfTimePicker: React.FC<NxfTimePickerProps> = ({ value, onChange, className = '' }) => (
  <input
    type="time"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`border px-3 py-2 rounded w-full ${className}`}
  />
);
