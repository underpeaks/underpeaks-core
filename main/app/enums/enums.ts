// enums.ts
// Centralized enums for NextFlutter project

/** ===========================
 * User-related enums
 * =========================== */
export const USER_ROLES = ["admin", "editor", "viewer", "guest"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "inactive", "suspended", "pending"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** ===========================
 * Project-related enums
 * =========================== */
export const PROJECT_STATUSES = ["draft", "active", "archived", "deleted"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_VISIBILITY = ["private", "public", "team"] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[number];

/** ===========================
 * API-related enums
 * =========================== */
export const API_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type ApiMethod = (typeof API_METHODS)[number];

export const API_STATUSES = ["draft", "active", "deprecated", "retired"] as const;
export type ApiStatus = (typeof API_STATUSES)[number];

/** ===========================
 * E-commerce / Marketplace enums
 * =========================== */
export const PRODUCT_CATEGORIES = [
  "electronics",
  "fashion",
  "home",
  "services",
  "vehicles",
  "boats",
  "aircraft",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "canceled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["card", "paypal", "bank_transfer", "mobile_money"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** ===========================
 * System / Installer enums
 * =========================== */
export const SETTING_TYPES = ["string", "number", "boolean", "json"] as const;
export type SettingType = (typeof SETTING_TYPES)[number];

export const INSTALL_STEP_STATUSES = ["pending", "completed", "failed"] as const;
export type InstallStepStatus = (typeof INSTALL_STEP_STATUSES)[number];

/** ===========================
 * General / Misc enums
 * =========================== */
export const LOG_LEVELS = ["info", "warn", "error", "debug"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const NOTIFICATION_TYPES = ["email", "sms", "push", "in_app"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const BOOLEAN_STRINGS = ["yes", "no"] as const;
export type BooleanString = (typeof BOOLEAN_STRINGS)[number];
