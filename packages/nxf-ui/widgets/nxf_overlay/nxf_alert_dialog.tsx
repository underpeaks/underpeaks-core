// packages/nxf-ui/widgets/nxf_overlay/nxf_alert_dialog.tsx
import React from 'react';

interface NxfAlertDialogProps {
  title: string;
  content: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const NxfAlertDialog: React.FC<NxfAlertDialogProps> = ({
  title,
  content,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="mb-4">{content}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm border rounded">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-blue-600 text-white rounded">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
