// ============================================================
// FILE: app/[locale]/console/users/components/UserAvatar.tsx
// PURPOSE: Renders an initials-based avatar with a
//          deterministic background colour. Falls back to
//          avatar_url if provided. Used in table rows and
//          the user drawer header.
// ============================================================

import { needsDarkText } from '@/app/lib/avatarColour';

interface UserAvatarProps {
  initials: string;
  colour: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

export default function UserAvatar({
  initials,
  colour,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const textColour = needsDarkText(colour) ? '#1a1a1a' : '#ffffff';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={initials}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center
                  font-semibold flex-shrink-0 select-none ${className}`}
      style={{ backgroundColor: colour, color: textColour }}
      aria-label={`Avatar for ${initials}`}
    >
      {initials}
    </div>
  );
}