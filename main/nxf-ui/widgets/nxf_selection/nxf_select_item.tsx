// NxfSelectItem.tsx
import React from 'react';

interface NxfSelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const NxfSelectItem: React.FC<NxfSelectItemProps> = ({
  value,
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      role="option"
      data-value={value}
      tabIndex={0}
      className={`px-3 py-2 cursor-pointer hover:bg-gray-200 ${className}`}
      onClick={onClick}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {children}
    </div>
  );
};
