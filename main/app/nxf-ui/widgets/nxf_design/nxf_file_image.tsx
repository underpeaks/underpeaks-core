// NxfFileImage.tsx
import React, { useEffect, useState } from 'react';

interface NxfFileImageProps {
  file: File;
  alt?: string;
  className?: string;
}

export const NxfFileImage: React.FC<NxfFileImageProps> = ({
  file,
  alt = '',
  className = '',
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    return () => {
      setPreviewUrl(null);
    };
  }, [file]);

  if (!previewUrl) return null;

  return <img src={previewUrl} alt={alt} className={className} />;
};
