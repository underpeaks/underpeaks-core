// packages/nxf-ui/widgets/nxf_overlay/nxf_tooltip.tsx
import React, { useState } from 'react';

interface NxfTooltipProps {
  text: string;
  children: React.ReactNode;
}

export const NxfTooltip: React.FC<NxfTooltipProps> = ({ text, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded shadow z-50">
          {text}
        </div>
      )}
    </div>
  );
};
