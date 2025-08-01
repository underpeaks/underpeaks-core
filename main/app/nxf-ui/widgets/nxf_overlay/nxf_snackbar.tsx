// nxf_overlay/nxf_snackbar.tsx
import React, { useEffect } from 'react';

export interface NxfSnackbarProps {
  show: boolean;
  message: string;
  duration?: number;
  onClose: () => void;
}

export const NxfSnackbar: React.FC<NxfSnackbarProps> = ({
  show,
  message,
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-50">
      {message}
    </div>
  );
};
