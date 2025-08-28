import React from 'react';

interface NxfAvatarProps {
  name: string;
  src?: string;
  size?: number;
}

export const NxfAvatar: React.FC<NxfAvatarProps> = ({ name, src, size = 40 }) => {
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return src ? (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="rounded-full object-cover"
    />
  ) : (
    <div
      className="rounded-full bg-gray-500 text-white flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
};
