// packages/nxf-ui/widgets/nxf_selection/nxf_switch.tsx
import React from 'react';

interface NxfSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export const NxfSwitch: React.FC<NxfSwitchProps> = ({
  checked,
  onChange,
  className = '',
}) => (
  <label className={`relative inline-block w-12 h-6 ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="opacity-0 w-0 h-0"
    />
    <span
      className={`absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full transition ${
        checked ? 'bg-blue-500' : ''
      }`}
    />
    <span
      className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition ${
        checked ? 'translate-x-6' : ''
      }`}
    />
  </label>
);
