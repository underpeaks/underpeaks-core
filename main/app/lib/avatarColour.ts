// ============================================================
// FILE: app/lib/avatarColour.ts
// ============================================================

const AVATAR_COLOURS = [
  '#5C6BC0', '#26A69A', '#EF5350', '#AB47BC', '#29B6F6',
  '#66BB6A', '#FFA726', '#EC407A', '#8D6E63', '#78909C',
  '#42A5F5', '#FF7043',
];

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function getAvatarColour(seed: string): string {
  return AVATAR_COLOURS[hashString(seed) % AVATAR_COLOURS.length];
}

export function getAvatarInitials(
  fullName?: string,
  firstName?: string,  // kept for API compatibility, not used by nxf_users
  lastName?: string,   // kept for API compatibility, not used by nxf_users
  email?: string
): string {
  // Priority: full_name → email prefix
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }

  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }

  if (email) {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  }

  return '??';
}

export function needsDarkText(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.179;
}