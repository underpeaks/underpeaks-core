import {
  FiList,
  FiFileText,
  FiEdit,
  FiGrid,
  FiImage,
  FiColumns,
  FiCalendar,
  FiShoppingCart,
  FiMap,
  FiMessageCircle,
  FiCode,
  FiLayout,
  FiUser,
  FiSearch,
  FiSettings,
  FiCreditCard,
  FiClipboard,
  FiHome,
   FiLogIn,
  FiUserPlus,
  FiKey,
  FiRefreshCcw,
  FiShield,
  FiLock,
  FiMail,
  FiCheckCircle,
  
  FiSliders,
} from 'react-icons/fi'

import { IconType } from 'react-icons'

export type PageVisibility = 'public' | 'admin' | 'draft'

export interface PageItem {
  page_id:         string
  name:            string
  slug:            string
  model:           string | null
  template:        string
  visibility:      PageVisibility
  seo_title:       string
  seo_description: string
  project_id:      string
  created_at:      string
  updated_at:      string
  is_system:       boolean
  hidden:          boolean
}

export interface ModelSummary {
  sm_id: string
  name:  string
}

// ---------------------------------------------------------------------------
// Template Types
// ---------------------------------------------------------------------------

export type TemplateDef = {
  id:     string
  name:   string
  locked: boolean
  icon:   IconType
}

export type TemplateGroup = {
  group:     string
  templates: TemplateDef[]
}

// ---------------------------------------------------------------------------
// Template Groups
// ---------------------------------------------------------------------------

export const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
     group: 'Front End',
    templates: [
     {
  id: 'splash',
  name: 'Splash Screen',
  locked: false,
  icon: FiImage,
},
{
  id: 'home',
  name: 'Home Screen',
  locked: false,
  icon: FiHome,
},
{
  id: 'onboarding',
  name: 'Onboarding Screen',
  locked: false,
  icon: FiSliders,
},
    
    ]},
    {
    group: 'Views',
    templates: [
      {
        id: 'list',
        name: 'List View',
        locked: false,
        icon: FiList,
      },
      {
        id: 'grid',
        name: 'Grid View',
        locked: false,
        icon: FiGrid,
      },
      {
        id: 'gallery',
        name: 'Gallery',
        locked: false,
        icon: FiImage,
      },
      {
        id: 'kanban',
        name: 'Kanban',
        locked: true,
        icon: FiColumns,
      },
      {
        id: 'calendar',
        name: 'Calendar',
        locked: true,
        icon: FiCalendar,
      },
    ],
  },
   {
    group: 'Auth Flow',
    templates: [
      {
      id: 'sign_in',
      name: 'Sign In',
      locked: false,
      icon: FiLogIn,
    },

    {
      id: 'sign_up',
      name: 'Sign Up',
      locked: false,
      icon: FiUserPlus,
    },

    {
      id: 'forgot_password',
      name: 'Forgot Password',
      locked: false,
      icon: FiKey,
    },

    {
      id: 'reset_password',
      name: 'Reset Password',
      locked: false,
      icon: FiRefreshCcw,
    },

    {
      id: 'otp_request',
      name: 'Request OTP',
      locked: true,
      icon: FiShield,
    },

    {
      id: 'otp_entry',
      name: 'Enter OTP',
      locked: true,
      icon: FiLock,
    },

    ],
  },

  {
    group: 'Data Entry',
    templates: [
      {
        id: 'form',
        name: 'Form',
        locked: false,
        icon: FiEdit,
      },
      {
        id: 'detail',
        name: 'Detail View',
        locked: false,
        icon: FiFileText,
      },
    ],
  },

  {
    group: 'Pages',
    templates: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        locked: false,
        icon: FiLayout,
      },
      {
        id: 'landing',
        name: 'Landing',
        locked: false,
        icon: FiHome,
      },
      {
        id: 'blog-post',
        name: 'Blog Post',
        locked: false,
        icon: FiClipboard,
      },
      {
        id: 'profile',
        name: 'Profile',
        locked: false,
        icon: FiUser,
      },
      {
        id: 'splash',
        name: 'Splash',
        locked: false,
        icon: FiLayout,
      },
    ],
  },

  {
    group: 'Commerce',
    templates: [
      {
        id: 'cart',
        name: 'Cart',
        locked: false,
        icon: FiShoppingCart,
      },
      {
        id: 'checkout',
        name: 'Checkout',
        locked: true,
        icon: FiCreditCard,
      },
      {
        id: 'wallet',
        name: 'Wallet',
        locked: true,
        icon: FiCreditCard,
      },
      {
        id: 'invoice',
        name: 'Invoice',
        locked: true,
        icon: FiClipboard,
      },
    ],
  },

  {
    group: 'Communication',
    templates: [
      {
        id: 'chat',
        name: 'Chat',
        locked: false,
        icon: FiMessageCircle,
      },
      {
        id: 'messages',
        name: 'Messages',
        locked: true,
        icon: FiMessageCircle,
      },
      {
        id: 'feed',
        name: 'Feed',
        locked: true,
        icon: FiLayout,
      },
    ],
  },

  {
    group: 'Utility',
    templates: [
      {
        id: 'map',
        name: 'Map',
        locked: false,
        icon: FiMap,
      },
      {
        id: 'search',
        name: 'Search',
        locked: true,
        icon: FiSearch,
      },
      {
        id: 'settings',
        name: 'Settings',
        locked: true,
        icon: FiSettings,
      },
    ],
  },

  {
    group: 'Custom',
    templates: [
      {
        id: 'custom',
        name: 'Custom',
        locked: false,
        icon: FiCode,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Flat List
// ---------------------------------------------------------------------------

export const TEMPLATES = TEMPLATE_GROUPS.flatMap(
  (group) => group.templates
)

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const TEMPLATE_LABELS: Record<string, string> =
  Object.fromEntries(
    TEMPLATES.map((template) => [
      template.id,
      template.name,
    ])
  )