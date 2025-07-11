// packages/nxf-ui/widgets/nxf_gesture/nxf_drag_target.tsx
import React from 'react';

interface NxfDragTargetProps {
  onDrop: (data: any) => void;
  children: React.ReactNode;
  className?: string;
}

export const NxfDragTarget: React.FC<NxfDragTargetProps> = ({ onDrop, children, className = '' }) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('custom');
    onDrop(JSON.parse(data));
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`p-2 border border-dashed border-gray-400 ${className}`}
    >
      {children}
    </div>
  );
};
