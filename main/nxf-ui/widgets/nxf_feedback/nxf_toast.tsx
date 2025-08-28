import React, { useEffect } from 'react';

interface NxfToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export const NxfToast: React.FC<NxfToastProps> = ({ message, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 bg-black text-white px-4 py-2 rounded shadow-lg z-50">
      {message}
    </div>
  );
};
