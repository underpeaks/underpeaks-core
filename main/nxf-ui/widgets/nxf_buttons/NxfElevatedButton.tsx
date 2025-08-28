import React from 'react';

export interface NxfElevatedButtonProps {
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
  disabled?: boolean;
}

export const NxfElevatedButton: React.FC<NxfElevatedButtonProps> = ({
  onClick,
  className = '',
  type = 'button',
  children,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-500 
      ${disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}
      ${className}`}
    type={type}
    disabled={disabled}
  >
    {children}
  </button>
);
