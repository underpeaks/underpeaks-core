// packages/nxf-ui/widgets/nxf_progress/nxf_linear_progress_indicator.tsx
import React from 'react';

interface NxfLinearProgressProps {
  value: number; // 0 to 100
  className?: string;
}

export const NxfLinearProgressIndicator: React.FC<NxfLinearProgressProps> = ({
  value,
  className = '',
}) => {
  return (
    <div className={`w-full h-2 bg-gray-200 rounded ${className}`}>
      <div
        className="h-full bg-blue-600 rounded transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};
