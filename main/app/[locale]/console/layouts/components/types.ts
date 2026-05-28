export type MenuTarget = '_self' | '_blank'

export interface AdminPage {
  page_id:    string
  title:      string
  slug:       string
  model_id:   string | null
  model_name: string | null
}

export interface MenuItem {
  menu_id:   string
  label:     string
  page_id:   string | null
  icon:      string
  target:    MenuTarget
  visible:   boolean
  parent_id: string | null
  order:     number
}

export const ICON_OPTIONS = [
  { id: 'FiHome',         labelKey: 'home'     },
  { id: 'FiGrid',         labelKey: 'grid'     },
  { id: 'FiPackage',      labelKey: 'package'  },
  { id: 'FiUsers',        labelKey: 'users'    },
  { id: 'FiSettings',     labelKey: 'settings' },
  { id: 'FiFileText',     labelKey: 'file'     },
  { id: 'FiShoppingCart', labelKey: 'cart'     },
  { id: 'FiMail',         labelKey: 'mail'     },
  { id: 'FiStar',         labelKey: 'star'     },
  { id: 'FiInfo',         labelKey: 'info'     },
] as const