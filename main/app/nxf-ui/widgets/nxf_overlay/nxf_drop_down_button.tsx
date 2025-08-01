// packages/nxf-ui/widgets/nxf_overlay/nxf_drop_down_button.tsx
import React, { useState } from 'react';

interface NxfDropdownItem {
  label: string;
  value: string;
}

interface NxfDropdownProps {
  items: NxfDropdownItem[];
  onChange: (value: string) => void;
  label?: string;
}

export const NxfDropDownButton: React.FC<NxfDropdownProps> = ({ items, onChange, label }) => {
  return (
    <select
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2"
    >
      {label && <option value="">{label}</option>}
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
};
