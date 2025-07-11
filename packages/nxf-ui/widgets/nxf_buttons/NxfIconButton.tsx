// NxfIconButton.tsx
import React from 'react';

interface NxfIconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export const NxfIconButton: React.FC<NxfIconButtonProps> = ({
  onClick,
  disabled = false,
  icon,
  className = '',
  ariaLabel = 'Icon Button',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center p-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${className}`}
    >
      {icon}
    </button>
  );
};
