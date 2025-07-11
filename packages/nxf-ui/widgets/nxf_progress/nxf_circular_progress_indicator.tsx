// packages/nxf-ui/widgets/nxf_progress/nxf_circular_progress_indicator.tsx
import React from 'react';

interface NxfCircularProgressProps {
  size?: number;
  className?: string;
}

export const NxfCircularProgressIndicator: React.FC<NxfCircularProgressProps> = ({
  size = 24,
  className = '',
}) => {
  return (
    <svg
      className={`animate-spin text-blue-600 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
};
