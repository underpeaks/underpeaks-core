// NxfSelectValue.tsx
import React from 'react';

interface NxfSelectValueProps {
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

export const NxfSelectValue: React.FC<NxfSelectValueProps> = ({
  children,
  placeholder = 'Select an option',
  className = '',
}) => {
  return (
    <span className={className}>
      {children ?? placeholder}
    </span>
  );
};
