/**
 * IconRegistry.ts
 *
 * A central lookup table that maps icon name strings to their corresponding
 * React icon components.
 *
 * Why this file exists:
 *   In a dynamic application, the icons shown in navigation menus, sidebar
 *   items, or feature cards are often configured at runtime — for example,
 *   stored in a database or a JSON config file as plain strings like "FiHome"
 *   or "FiSettings". React components cannot be stored in a database, so we
 *   need a way to convert those strings back into real, renderable components
 *   when the app runs.
 *
 *   This registry provides that conversion in one place. Any part of the app
 *   that needs to render a dynamic icon simply imports IconRegistry and does:
 *
 *     const Icon = IconRegistry[iconName]
 *     if (Icon) return <Icon size={20} />
 *
 * Icon library used — react-icons/fi (Feather Icons):
 *   Feather is a collection of clean, consistent open-source icons. The "Fi"
 *   prefix on every name stands for "Feather Icons". All icons in this file
 *   come from that set. You can browse the full set at https://react-icons.github.io/react-icons/icons/fi/
 *
 * How to add a new icon:
 *   1. Find the icon name on the react-icons Feather page (e.g. FiStar).
 *   2. Add it to the import list at the top of this file.
 *   3. Add it as a new entry in the IconRegistry object below.
 *   The string key must exactly match the import name so that dynamic
 *   lookups (e.g. IconRegistry['FiStar']) resolve correctly.
 *
 * TypeScript note:
 *   Record<string, IconType> means "an object whose keys are strings and
 *   whose values are react-icons icon components". IconType is the type that
 *   react-icons uses for all its icon components, so any Feather (or other
 *   react-icons) icon is a valid value here.
 */

import type { IconType } from 'react-icons'
import {
  FiHome,         // House outline — typically used for a Home / Dashboard link
  FiUsers,        // Two people silhouette — used for Users, Team, or Members
  FiSettings,     // Gear icon — used for Settings or Configuration
  FiShoppingCart, // Shopping cart — used for Cart, Orders, or E-commerce
  FiPackage,      // Box / parcel — used for Products, Packages, or Inventory
  FiUpload,       // Arrow pointing up from a line — used for Upload or Import
  FiLayout,       // Rectangle with sidebar — used for Layout, Dashboard, or Pages
  FiCreditCard,   // Credit card outline — used for Billing, Payments, or Cards
  FiTruck,        // Delivery truck — used for Shipping, Delivery, or Logistics
  FiZap,          // Lightning bolt — used for Activity, Automations, or Speed
  FiFileText,     // Document with lines — used for Reports, Documents, or Logs
  FiCalendar,     // Calendar grid — used for Events, Scheduling, or Dates
} from 'react-icons/fi'

/**
 * IconRegistry
 *
 * A plain object that maps each icon's string name to its React component.
 *
 * Keys   — the icon name exactly as imported (e.g. 'FiHome').
 *          These strings are what you would store in a database or config file
 *          when you want to reference an icon dynamically.
 *
 * Values — the actual React icon component (e.g. the FiHome function).
 *          These are valid JSX components and can be rendered directly:
 *            const Icon = IconRegistry['FiHome']
 *            return <Icon size={20} color="gray" />
 *
 * Important: if a lookup returns undefined (the key is not in the registry),
 * always guard before rendering to avoid a runtime crash:
 *   const Icon = IconRegistry[name]
 *   if (!Icon) return null
 *   return <Icon />
 */
export const IconRegistry: Record<string, IconType> = {
  FiHome,
  FiUsers,
  FiSettings,
  FiShoppingCart,
  FiPackage,
  FiUpload,
  FiLayout,
  FiCreditCard,
  FiTruck,
  FiZap,
  FiFileText,
  FiCalendar,
}