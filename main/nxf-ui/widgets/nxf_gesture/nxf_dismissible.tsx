// packages/nxf-ui/widgets/nxf_gesture/nxf_dismissible.tsx
import React, { useState } from 'react';

interface NxfDismissibleProps {
  onDismiss: () => void;
  children: React.ReactNode;
}

export const NxfDismissible: React.FC<NxfDismissibleProps> = ({ onDismiss, children }) => {
  const [visible, setVisible] = useState(true);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="relative">
      {children}
      <button
        onClick={handleDismiss}
        className="absolute top-0 right-0 text-sm text-red-500 p-1"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};
