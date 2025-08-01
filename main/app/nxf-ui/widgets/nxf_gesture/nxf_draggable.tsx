// packages/nxf-ui/widgets/nxf_gesture/nxf_draggable.tsx
import React from 'react';

interface NxfDraggableProps {
  data: any;
  children: React.ReactNode;
}

export const NxfDraggable: React.FC<NxfDraggableProps> = ({ data, children }) => (
  <div draggable onDragStart={(e) => e.dataTransfer.setData('custom', JSON.stringify(data))}>
    {children}
  </div>
);
