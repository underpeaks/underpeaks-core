export const USER_STATUS = {
  ACTIVE: 'active',
  NEEDS_EMAIL_VERIFICATION: 'needs_email_verification',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  BLOCKED: 'blocked',
  DISABLED: 'disabled', 
} as const

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS]
