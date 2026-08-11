import {
  FiHome, FiPackage, FiShoppingCart, FiUsers,
  FiTruck, FiCalendar, FiDatabase, FiLayout,
  FiFileText, FiImage, FiLink, FiGrid, FiGift,
  FiDroplet, FiZap, FiLock,
  FiCompass,
} from 'react-icons/fi'
import type { ReactNode } from 'react'

export interface MenuItem {
  label:      string
  path:       string
  icon:       ReactNode
  post_icon?: ReactNode
  is_system?: boolean
}

export interface MenuSection {
  title:    string
  items:    MenuItem[]
  hidden?:  boolean  // hidden sections never render in the sidebar
}

export const menuSections: MenuSection[] = [

  // -------------------------------------------------------------------------
  // SYSTEM — never rendered, always present in sidebar logic
  // Dashboard and Users are hardcoded here and cannot be touched by the user
  // via the Menu page. They are injected directly by the Sidebar component.
  // -------------------------------------------------------------------------
  {
    title:  'system',
    hidden: true,
    items: [
      {
        label:     'Dashboard',
        path:      '/console/dashboard',
        icon:      <FiHome size={14} />,
        is_system: true,
      },
      {
        label:     'Users',
        path:      '/console/cmsusers',
        icon:      <FiUsers size={14} />,
        is_system: true,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Business — core e-commerce and operations pages
  // -------------------------------------------------------------------------
  // {
  //   title: 'Business',
  //   items: [
      
  //   ],
  // },

  // -------------------------------------------------------------------------
  // Content — models, menu, pages, theme
  // -------------------------------------------------------------------------
  {
    title: 'content',
    items: [
      { label: 'Shared Models', path: '/console/models',     icon: <FiDatabase size={14} /> },
      { label: 'Menu',         path: '/console/layouts',    icon: <FiLayout size={14} />   },
      { label: 'Pages',        path: '/console/pages',      icon: <FiFileText size={14} /> },
      { label: 'Navigator',        path: '/console/navigator',  icon: <FiCompass size={14} />  },
      { label: 'Theme',        path: '/console/themePage',  icon: <FiDroplet size={14} />  },
    ],
  },

  // -------------------------------------------------------------------------
  // Assets — file and media management
  // -------------------------------------------------------------------------
  {
    title: 'Assets',
    items: [
      { label: 'Storage', path: '/console/media-library', icon: <FiImage size={14} /> },
    ],
  },

  // -------------------------------------------------------------------------
  // Configuration — locked paid features
  // -------------------------------------------------------------------------
  {
    title: 'Configurations',
    items: [
      { label: 'Integrations', path: '#', icon: <FiLink size={14} />, post_icon: <FiLock size={14} /> },
      { label: 'Api\'s',         path: '#', icon: <FiZap size={14} />,  post_icon: <FiLock size={14} /> },
    ],
  },
]