// MenuItems.tsx
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
  FiUpload,
  FiSettings,
  FiCreditCard,
  FiZap,
  FiUserPlus,
  FiLink,
  FiGrid,
  FiGift,
  FiDroplet
 
} from 'react-icons/fi'

import type { ReactNode } from 'react'

export interface MenuItem {
  label: string
  path: string
  icon: ReactNode
}

export interface MenuSection {
  title: string
  items: MenuItem[]
}

export const menuSections: MenuSection[] = [
  {
    title: 'Business',
    items: [
      { label: 'Dashboard', path: '/console/dashboard', icon: <FiHome size={14} /> },
      { label: 'Products', path: '/console/products', icon: <FiPackage size={14} /> },
      { label: 'Categories', path: '/console/categories', icon: <FiGrid size={14} /> },
      { label: 'Orders', path: '/console/orders', icon: <FiShoppingCart size={14} /> },
      { label: 'Coupons', path: '/console/coupons', icon: <FiGift size={14} /> },
      { label: 'Users', path: '/console/users', icon: <FiUsers size={14} /> },
      { label: 'Shipping', path: '/console/shipping', icon: <FiTruck size={14} /> },
      { label: 'Services', path: '/console/services', icon: <FiCalendar size={14} /> },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Shared Models', path: '/console/models', icon: <FiDatabase size={14} /> },
      { label: 'Menu', path: '/console/layouts', icon: <FiLayout size={14} /> },
      { label: 'Pages', path: '/console/pages', icon: <FiFileText size={14} /> },
      { label: 'Theme', path: '/console/themePage', icon: <FiDroplet  size={14} /> },
    ],
  },
  {
    title: 'Assets',
    items: [
      { label: 'Storage', path: '/console/media-library', icon: <FiImage size={14} /> },
      // { label: 'CDN Uploads', path: '/console/cdn', icon: <FiUpload size={14} /> },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Integrations', path: '/console/integrations', icon: <FiLink size={14} /> },
      { label: 'APIs & Webhooks', path: '/console/api-hooks', icon: <FiZap size={14} /> },
    ],
  },
]
