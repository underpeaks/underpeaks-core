// packages/nxf-ui/widgets/nxf_overlay/nxf_bottom_sheet.tsx
import React from 'react';

interface NxfBottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export const NxfBottomSheet: React.FC<NxfBottomSheetProps> = ({
  children,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50">
      <div className="absolute bottom-0 w-full bg-white rounded-t-lg p-4 shadow-lg">
        <button onClick={onClose} className="text-sm text-gray-500 mb-2">Close</button>
        {children}
      </div>
    </div>
  );
};
