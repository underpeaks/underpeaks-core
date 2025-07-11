// packages/nxf-ui/widgets/nxf_gesture/nxf_long_press_draggable.tsx
import React, { useState } from 'react';

interface NxfLongPressDraggableProps {
  data: any;
  delay?: number;
  children: React.ReactNode;
}

export const NxfLongPressDraggable: React.FC<NxfLongPressDraggableProps> = ({
  data,
  delay = 600,
  children,
}) => {
  const [draggable, setDraggable] = useState(false);

  const handleTouchStart = () => {
    setTimeout(() => setDraggable(true), delay);
  };

  const handleTouchEnd = () => setDraggable(false);

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData('custom', JSON.stringify(data))}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};
