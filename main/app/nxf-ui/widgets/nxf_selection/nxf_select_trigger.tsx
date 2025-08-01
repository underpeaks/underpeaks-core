// NxfSelectTrigger.tsx
import React from 'react';

interface NxfSelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const NxfSelectTrigger: React.FC<NxfSelectTriggerProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`inline-block cursor-pointer ${className}`}>
      {children}
    </div>
  );
};
