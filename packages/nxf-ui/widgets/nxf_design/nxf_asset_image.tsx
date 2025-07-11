// NxfAssetImage.tsx
import React from 'react';

interface NxfAssetImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export const NxfAssetImage: React.FC<NxfAssetImageProps> = ({
  src,
  alt = '',
  className = '',
}) => {
  return <img src={`/assets/${src}`} alt={alt} className={className} />;
};
