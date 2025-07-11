import React, { useCallback } from 'react';

interface NxfFileDropzoneProps {
  onDrop: (files: FileList) => void;
}

export const NxfFileDropzone: React.FC<NxfFileDropzoneProps> = ({ onDrop }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
    },
    [onDrop]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-400 rounded-lg p-6 text-center"
    >
      <p className="text-sm text-gray-500">Drag files here or click to upload</p>
    </div>
  );
};
