import React, { useState } from 'react';

interface NxfTextFormFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  validator?: (value: string) => string | null; // returns error message or null if valid
  className?: string;
  label?: string;
}

export const NxfTextFormField: React.FC<NxfTextFormFieldProps> = ({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  validator,
  className = '',
  label,
}) => {
  const [touched, setTouched] = useState(false);
  const error = touched && validator ? validator(value) : null;

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="mb-1 font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        className={`border rounded px-3 py-2 focus:outline-none focus:ring ${
          error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'
        }`}
      />
      {error && <span className="mt-1 text-sm text-red-600">{error}</span>}
    </div>
  );
};
