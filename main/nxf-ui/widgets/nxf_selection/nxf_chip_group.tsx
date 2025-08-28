import React from 'react';

interface NxfChipGroupProps {
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
}

export const NxfChipGroup: React.FC<NxfChipGroupProps> = ({ options, selected, onChange }) => {
  const toggle = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter((o) => o !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => toggle(option)}
          className={`px-3 py-1 rounded-full border ${
            selected.includes(option)
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};
