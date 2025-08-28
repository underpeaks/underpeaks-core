// NxfNetworkImage.tsx
import React from 'react';

interface NxfNetworkImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export const NxfNetworkImage: React.FC<NxfNetworkImageProps> = ({
  src,
  alt = '',
  className = '',
}) => {
  return <img src={src} alt={alt} className={className} />;
};
