// MenuItems.tsx

/**
 * @file MenuItems.tsx
 * @description
 * This file defines the navigation menu structure for the admin console sidebar.
 * It exports a `menuSections` array that describes every section and item
 * that appears in the left-hand navigation panel.
 *
 * How is this file used?
 * -----------------------
 * The sidebar component imports `menuSections` and maps over it to render
 * the navigation. This file is the single source of truth for:
 *   - What pages exist in the console
 *   - How they are grouped into sections
 *   - What icon and path each item uses
 *
 * To add a new menu item, add an entry to the relevant section's `items` array.
 * To add a new section, add a new object to the `menuSections` array.
 *
 * How are labels translated?
 * ---------------------------
 * Labels are defined here as translation keys (e.g. 'dashboard', 'products').
 * The sidebar component that renders these items is responsible for calling
 * t(`menu.items.${item.label}`) to convert them to display text.
 * This keeps the menu structure clean and free of language-specific strings.
 *
 * Structure overview:
 * --------------------
 * menuSections
 *   ├── Business
 *   │     Dashboard, Products, Categories, Orders,
 *   │     Coupons, Users, Shipping, Services
 *   ├── Content
 *   │     Shared Models, Menu, Pages, Theme
 *   ├── Assets
 *   │     Storage
 *   └── Configuration
 *         Integrations, APIs & Webhooks
 */

import {
  FiHome,
  FiPackage,
  FiShoppingCart,
  FiUsers,
  FiTruck,
  FiCalendar,
  FiDatabase,
  FiLayout,
  FiFileText,
  FiImage,
  FiSettings,
  FiCreditCard,
  FiZap,
  FiUserPlus,
  FiLink,
  FiGrid,
  FiGift,
  FiDroplet,
} from 'react-icons/fi'

import type { ReactNode } from 'react'

/**
 * @interface MenuItem
 * @description
 * Represents a single clickable item in the sidebar navigation.
 *
 * @property {string} label
 *   A translation key used to look up the display text for this item.
 *   Example: 'dashboard' → t('menu.items.dashboard') → "Dashboard"
 *   The actual rendering component is responsible for calling t() on this value.
 *
 * @property {string} path
 *   The URL path this item navigates to when clicked.
 *   Example: '/console/products'
 *
 * @property {ReactNode} icon
 *   A React icon element rendered to the left of the label.
 *   All icons come from the `react-icons/fi` (Feather Icons) library.
 *   Size is kept at 14px for consistent sidebar density.
 */
export interface MenuItem {
  label: string
  path: string
  icon: ReactNode
}

/**
 * @interface MenuSection
 * @description
 * Represents a labelled group of related menu items in the sidebar.
 * Sections are rendered with a small heading above their items.
 *
 * @property {string} title
 *   A translation key for the section heading.
 *   Example: 'business' → t('menu.sections.business') → "Business"
 *
 * @property {MenuItem[]} items
 *   The list of navigation items that belong to this section.
 */
export interface MenuSection {
  title: string
  items: MenuItem[]
}

/**
 * @constant menuSections
 * @type {MenuSection[]}
 * @description
 * The full navigation structure for the admin console sidebar.
 * Grouped into four sections: Business, Content, Assets, and Configuration.
 *
 * All `label` and `title` values are translation keys.
 * The component rendering this data must pass them through t() before display.
 */
export const menuSections: MenuSection[] = [
  {
    /**
     * Business section — core e-commerce and operations pages.
     * These are the day-to-day management screens for running the business.
     */
    title: 'business',
    items: [
      {
        label: 'dashboard',
        path: '/console/dashboard',
        icon: <FiHome size={14} />,
      },
      {
        label: 'products',
        path: '/console/products',
        icon: <FiPackage size={14} />,
      },
      {
        label: 'categories',
        path: '/console/categories',
        icon: <FiGrid size={14} />,
      },
      {
        label: 'orders',
        path: '/console/orders',
        icon: <FiShoppingCart size={14} />,
      },
      {
        label: 'coupons',
        path: '/console/coupons',
        icon: <FiGift size={14} />,
      },
      {
        label: 'users',
        path: '/console/users',
        icon: <FiUsers size={14} />,
      },
      {
        label: 'shipping',
        path: '/console/shipping',
        icon: <FiTruck size={14} />,
      },
      {
        label: 'services',
        path: '/console/services',
        icon: <FiCalendar size={14} />,
      },
    ],
  },
  {
    /**
     * Content section — pages and UI structure management.
     * Used to manage the data models, menus, pages, and visual theme
     * of the storefront that customers see.
     */
    title: 'content',
    items: [
      {
        label: 'Shared Models',
        path: '/console/models',
        icon: <FiDatabase size={14} />,
      },
      {
        label: 'Menu',
        path: '/console/layouts',
        icon: <FiLayout size={14} />,
      },
      {
        label: 'Pages',
        path: '/console/pages',
        icon: <FiFileText size={14} />,
      },
      {
        label: 'Theme',
        path: '/console/themePage',
        icon: <FiDroplet size={14} />,
      },
    ],
  },
  {
    /**
     * Assets section — file and media management.
     * Used to upload and organise images and other files
     * stored in the project's media library.
     */
    title: 'Assets',
    items: [
      {
        label: 'Storage',
        path: '/console/media-library',
        icon: <FiImage size={14} />,
      },
    ],
  },
  {
    /**
     * Configuration section — technical integrations and developer tools.
     * Used to connect third-party services and manage API endpoints / webhooks.
     */
    title: 'Configuration',
    items: [
      {
        label: 'Integrations',
        path: '/console/integrations',
        icon: <FiLink size={14} />,
      },
      {
        label: 'Api\'s',
        path: '/console/api-hooks',
        icon: <FiZap size={14} />,
      },
    ],
  },
]