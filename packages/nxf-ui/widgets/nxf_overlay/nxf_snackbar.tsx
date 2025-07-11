// packages/nxf-ui/widgets/nxf_overlay/nxf_snackbar.tsx
import React, { useEffect, useState } from 'react';

interface NxfSnackbarProps {
  message: string;
  show: boolean;
  duration?: number; // in milliseconds
  onClose?: () => void;
  className?: string;
}

export const NxfSnackbar: React.FC<NxfSnackbarProps> = ({
  message,
  show,
  duration = 3000,
  onClose,
  className = '',
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (show) {
      setVisible(true);
      timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
    }

    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow transition-opacity duration-300 ${className}`}
    >
      {message}
    </div>
  );
};
