/**
 * enums.ts — Centralised Enums for the NextFlutter Project
 *
 * This file defines all shared constant value sets (enums) used across the
 * application. Each enum is expressed as a TypeScript `as const` array paired
 * with a derived union type.
 *
 * ─── Why `as const` arrays instead of TypeScript `enum`? ─────────────────
 *
 * TypeScript's built-in `enum` keyword has a known quirk: it compiles to
 * JavaScript objects at runtime, which adds bundle weight and makes values
 * harder to iterate over or validate against at runtime.
 *
 * The pattern used here:
 *
 *   export const USER_ROLES = ["admin", "editor"] as const;
 *   export type  UserRole   = (typeof USER_ROLES)[number];
 *
 * gives us the best of both worlds:
 *   - The array (USER_ROLES) is available at runtime for validation,
 *     rendering dropdown options, or iterating over all possible values.
 *   - The type (UserRole) is a strict union ("admin" | "editor") that
 *     TypeScript enforces at compile time, preventing typos and invalid values.
 *
 * ─── How to add a new enum ────────────────────────────────────────────────
 *
 * 1. Add a new `as const` array constant with an UPPER_SNAKE_CASE name.
 * 2. Immediately below it, export a derived type using the pattern above.
 * 3. Group related enums under a clearly labelled section comment.
 *
 * ─── Sections in this file ────────────────────────────────────────────────
 *
 * - User-related       → roles and account statuses.
 * - Project-related    → project lifecycle statuses and visibility levels.
 * - API-related        → HTTP methods and API lifecycle statuses.
 * - E-commerce         → product categories, order statuses, payment methods.
 * - System / Installer → setting value types and installer step statuses.
 * - General / Misc     → log levels, notification channels, boolean strings.
 */

// ---------------------------------------------------------------------------
// User-related enums
// ---------------------------------------------------------------------------

/**
 * USER_ROLES
 * The set of permission levels a user can hold within the application.
 *
 * - admin   → Full access. Can manage all resources, users, and settings.
 * - editor  → Can create and modify content but cannot manage users or billing.
 * - viewer  → Read-only access. Cannot create or modify any content.
 * - guest   → Minimal access. Typically unauthenticated or unverified users.
 */
export const USER_ROLES = ['admin', 'editor', 'viewer', 'guest'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * USER_STATUSES
 * The possible lifecycle states of a user account.
 *
 * - active     → The account is in good standing and fully usable.
 * - inactive   → The account exists but the user has not been active.
 *                May be used to restrict access after prolonged inactivity.
 * - suspended  → The account has been manually blocked by an administrator.
 *                The user cannot log in until the suspension is lifted.
 * - pending    → The account was created but email verification or admin
 *                approval has not been completed yet.
 */
export const USER_STATUSES = ['active', 'inactive', 'suspended', 'pending'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// ---------------------------------------------------------------------------
// Project-related enums
// ---------------------------------------------------------------------------

/**
 * PROJECT_STATUSES
 * The possible lifecycle states of a project.
 *
 * - draft     → The project is being set up and is not yet live.
 * - active    → The project is fully operational and in use.
 * - archived  → The project has been deactivated but its data is retained.
 *               Archived projects are hidden from default views.
 * - deleted   → The project is marked for deletion. Data may be purged
 *               after a retention period.
 */
export const PROJECT_STATUSES = ['draft', 'active', 'archived', 'deleted'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/**
 * PROJECT_VISIBILITY
 * Controls who can see and access a project.
 *
 * - private  → Only the project owner and explicitly invited members can access it.
 * - public   → Anyone with the link can view the project.
 * - team     → All members of the owner's organisation or team can access it.
 */
export const PROJECT_VISIBILITY = ['private', 'public', 'team'] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITY)[number];

// ---------------------------------------------------------------------------
// API-related enums
// ---------------------------------------------------------------------------

/**
 * API_METHODS
 * The HTTP methods supported by the application's API routing layer.
 * These map directly to standard HTTP verbs and their conventional meanings:
 *
 * - GET     → Retrieve a resource. Should never modify data.
 * - POST    → Create a new resource.
 * - PUT     → Replace an existing resource entirely.
 * - DELETE  → Remove a resource.
 * - PATCH   → Partially update an existing resource.
 */
export const API_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
export type ApiMethod = (typeof API_METHODS)[number];

/**
 * API_STATUSES
 * The lifecycle states of an API endpoint or integration.
 *
 * - draft       → The endpoint is being designed and is not yet available.
 * - active      → The endpoint is live and available for use.
 * - deprecated  → The endpoint still works but is scheduled for removal.
 *                 Consumers should migrate to a newer alternative.
 * - retired     → The endpoint has been permanently removed and will return errors.
 */
export const API_STATUSES = ['draft', 'active', 'deprecated', 'retired'] as const;
export type ApiStatus = (typeof API_STATUSES)[number];

// ---------------------------------------------------------------------------
// E-commerce / Marketplace enums
// ---------------------------------------------------------------------------

/**
 * PRODUCT_CATEGORIES
 * The top-level categories available for classifying marketplace listings.
 *
 * - electronics  → Phones, computers, appliances, and other electronic devices.
 * - fashion      → Clothing, shoes, accessories, and apparel.
 * - home         → Furniture, décor, kitchen items, and household goods.
 * - services     → Offered skills or labour (e.g. cleaning, tutoring, repairs).
 * - vehicles     → Cars, motorcycles, trucks, and other road vehicles.
 * - boats        → Watercraft of all types.
 * - aircraft     → Planes, helicopters, drones, and other aerial vehicles.
 */
export const PRODUCT_CATEGORIES = [
  'electronics',
  'fashion',
  'home',
  'services',
  'vehicles',
  'boats',
  'aircraft',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * ORDER_STATUSES
 * The lifecycle states of a customer order from placement to resolution.
 *
 * - pending    → The order has been placed but payment has not been confirmed.
 * - paid       → Payment was received successfully. Awaiting fulfilment.
 * - shipped    → The order has been dispatched and is on its way to the customer.
 * - delivered  → The order has been received by the customer.
 * - canceled   → The order was canceled before fulfilment, by either party.
 * - refunded   → The order was returned and the customer has been reimbursed.
 */
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'delivered',
  'canceled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * PAYMENT_METHODS
 * The payment options available to customers at checkout.
 *
 * - card           → Credit or debit card (processed via a payment gateway).
 * - paypal         → PayPal account or PayPal-powered card payments.
 * - bank_transfer  → Direct bank-to-bank transfer (e.g. EFT, wire transfer).
 * - mobile_money   → Mobile wallet payments (e.g. M-Pesa, MTN MoMo).
 */
export const PAYMENT_METHODS = [
  'card',
  'paypal',
  'bank_transfer',
  'mobile_money',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// ---------------------------------------------------------------------------
// System / Installer enums
// ---------------------------------------------------------------------------

/**
 * SETTING_TYPES
 * The data types that an application setting value can hold.
 * Used by the settings system to correctly parse and validate stored values.
 *
 * - string   → A plain text value (e.g. a site name or URL).
 * - number   → A numeric value (e.g. a timeout duration or page size limit).
 * - boolean  → A true/false toggle (e.g. a feature flag).
 * - json     → A complex structured value stored as a JSON string.
 */
export const SETTING_TYPES = ['string', 'number', 'boolean', 'json'] as const;
export type SettingType = (typeof SETTING_TYPES)[number];

/**
 * INSTALL_STEP_STATUSES
 * The possible states of a single step in the installation wizard flow.
 *
 * - pending    → The step has not been started yet.
 * - completed  → The step finished successfully.
 * - failed     → The step encountered an error and did not complete.
 *                The installer will typically surface the error and allow a retry.
 */
export const INSTALL_STEP_STATUSES = ['pending', 'completed', 'failed'] as const;
export type InstallStepStatus = (typeof INSTALL_STEP_STATUSES)[number];

// ---------------------------------------------------------------------------
// General / Misc enums
// ---------------------------------------------------------------------------

/**
 * LOG_LEVELS
 * The severity levels used by the application's logging system.
 * Listed in ascending order of severity:
 *
 * - debug  → Highly detailed output for development troubleshooting.
 *            Should be disabled in production environments.
 * - info   → General informational messages about normal application flow.
 * - warn   → Something unexpected happened, but the application can continue.
 *            Worth investigating but not immediately critical.
 * - error  → A failure occurred that requires attention.
 *            The affected operation did not complete successfully.
 */
export const LOG_LEVELS = ['info', 'warn', 'error', 'debug'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * NOTIFICATION_TYPES
 * The delivery channels through which notifications can be sent to users.
 *
 * - email   → Sent to the user's registered email address.
 * - sms     → Sent as a text message to the user's phone number.
 * - push    → Sent as a push notification to the user's mobile device.
 * - in_app  → Displayed within the application's notification centre.
 */
export const NOTIFICATION_TYPES = ['email', 'sms', 'push', 'in_app'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * BOOLEAN_STRINGS
 * A human-readable alternative to true/false, used in places where a
 * boolean value needs to be stored or displayed as a string — for example,
 * in form inputs, URL query parameters, or CSV exports.
 *
 * - yes  → Represents true / enabled / confirmed.
 * - no   → Represents false / disabled / declined.
 */
export const BOOLEAN_STRINGS = ['yes', 'no'] as const;
export type BooleanString = (typeof BOOLEAN_STRINGS)[number];