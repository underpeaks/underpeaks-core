import React from 'react';

interface NxfModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const NxfModal: React.FC<NxfModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg relative w-full max-w-lg">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
};
