// NxfFloatingActionButton.tsx
import React from 'react';

interface NxfFloatingActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export const NxfFloatingActionButton: React.FC<NxfFloatingActionButtonProps> = ({
  onClick,
  disabled = false,
  icon,
  className = '',
  ariaLabel = 'Floating Action Button',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${className}`}
    >
      {icon}
    </button>
  );
};
