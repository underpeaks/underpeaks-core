// NxfIcon.tsx
import React from 'react';
import { IconType } from 'react-icons';

interface NxfIconProps {
  icon: IconType;
  size?: number;
  color?: string;
  className?: string;
}

export const NxfIcon: React.FC<NxfIconProps> = ({
  icon: Icon,
  size = 24,
  color = 'currentColor',
  className = '',
}) => {
  return (
    <span className={className}>
      <Icon size={size} color={color} />
    </span>
  );
};
