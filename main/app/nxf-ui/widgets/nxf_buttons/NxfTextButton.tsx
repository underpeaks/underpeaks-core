// NxfTextButton.tsx
import React from 'react';

interface NxfTextButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const NxfTextButton: React.FC<NxfTextButtonProps> = ({
  onClick,
  disabled = false,
  children,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-blue-600 font-medium px-3 py-1 rounded hover:underline focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
};
