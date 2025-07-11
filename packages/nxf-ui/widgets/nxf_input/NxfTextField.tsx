import React from 'react';

interface NxfTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  className?: string;
}

export const NxfTextField: React.FC<NxfTextFieldProps> = ({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  className = '',
}) => {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`border rounded px-3 py-2 focus:outline-none focus:ring ${className}`}
    />
  );
};
