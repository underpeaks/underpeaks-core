// packages/nxf-ui/widgets/nxf_selection/nxf_select.tsx
import React from 'react';

interface NxfSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const NxfSelect: React.FC<NxfSelectProps> = ({
  value,
  onValueChange,
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {/* Simulated select behavior - you may replace with actual select logic */}
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="border px-3 py-2 rounded-md"
      >
        {children}
      </select>
    </div>
  );
};
