// NxfElevatedButton.tsx
import React from 'react';

interface NxfElevatedButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const NxfElevatedButton: React.FC<NxfElevatedButtonProps> = ({
  onClick,
  disabled = false,
  children,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-blue-600 text-white font-semibold px-4 py-2 rounded shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
};
