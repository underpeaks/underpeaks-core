/**
 * lib/theme-defaults.ts
 *
 * Shared theme defaults — safe to import in both client and server code.
 * Do NOT import anything with Node.js dependencies here.
 */

import { ThemeColours, ThemeData, ThemeFlags, ThemeSpacing, ThemeTypography } from "../[locale]/console/themePage/ThemeContext";



export const DEFAULT_THEME: ThemeData = {
  colours: {
    primary:        '#0A0A0A',
    'primary-fg':   '#FFFFFF',
    secondary:      '#404040',
    'secondary-fg': '#FFFFFF',
    accent:         '#6366F1',
    background:     '#F9FAFB',
    surface:        '#FFFFFF',
    border:         '#E5E7EB',
    success:        '#22C55E',
    warning:        '#F59E0B',
    danger:         '#EF4444',
    text:           '#111827',
    'text-muted':   '#6B7280',
  } satisfies ThemeColours,

  typography: {
    headingFont:   'Inter',
    bodyFont:      'Inter',
    monoFont:      'JetBrains Mono',
    headingWeight: '700',
    bodyWeight:    '400',
    scale:         'default',
  } satisfies ThemeTypography,

  spacing: {
    radius:  'md',
    density: 'default',
    shadow:  'sm',
  } satisfies ThemeSpacing,

  flags: {
    // Appearance
    'dark-mode':          false,
    'system-theme':       false,
    // Localisation
    'multi-language':     false,
    'rtl-support':        false,
    // App Behaviour
    'offline-mode':       false,
    'push-notifications': false,
    'splash-screen':      false,
    'onboarding':         false,
    // Auth — paid
    '2fa':                false,
    'biometric':          false,
    'social-login':       false,
    'magic-link':         false,
    'sso':                false,
    // Advanced — paid
    'analytics':          false,
    'ab-testing':         false,
    'feature-gating':     false,
    // Code generation
    'flutter-state':      'riverpod',
    'nextjs-router':      'app-router',
  } satisfies ThemeFlags,
}