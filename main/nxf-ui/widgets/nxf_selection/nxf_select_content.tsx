// NxfSelectContent.tsx
import React from 'react';

interface NxfSelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const NxfSelectContent: React.FC<NxfSelectContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`absolute bg-white border rounded shadow-md mt-1 z-10 ${className}`}>
      {children}
    </div>
  );
};
