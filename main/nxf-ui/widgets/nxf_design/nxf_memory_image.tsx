// NxfMemoryImage.tsx
import React from 'react';

interface NxfMemoryImageProps {
  base64: string;
  alt?: string;
  className?: string;
}

export const NxfMemoryImage: React.FC<NxfMemoryImageProps> = ({
  base64,
  alt = '',
  className = '',
}) => {
  return <img src={`data:image/*;base64,${base64}`} alt={alt} className={className} />;
};
