// NxfOutlinedButton.tsx
import React from 'react';

interface NxfOutlinedButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const NxfOutlinedButton: React.FC<NxfOutlinedButtonProps> = ({
  onClick,
  disabled = false,
  children,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border border-blue-600 text-blue-600 font-semibold px-4 py-2 rounded hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
};
