// NxfSegmentedButton.tsx
import React, { useState } from 'react';

interface NxfSegmentedButtonProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export const NxfSegmentedButton: React.FC<NxfSegmentedButtonProps> = ({
  options,
  selected,
  onChange,
  className = '',
}) => {
  return (
    <div className={`inline-flex rounded border border-gray-300 overflow-hidden ${className}`}>
      {options.map(option => {
        const isSelected = option === selected;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`px-4 py-2 focus:outline-none ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};
