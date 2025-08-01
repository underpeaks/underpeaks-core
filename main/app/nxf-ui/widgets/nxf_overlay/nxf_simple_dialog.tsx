// packages/nxf-ui/widgets/nxf_overlay/nxf_simple_dialog.tsx
import React from 'react';

interface NxfSimpleDialogProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const NxfSimpleDialog: React.FC<NxfSimpleDialogProps> = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="mb-4">{children}</div>
        <button onClick={onClose} className="text-sm text-blue-600">
          Close
        </button>
      </div>
    </div>
  );
};
