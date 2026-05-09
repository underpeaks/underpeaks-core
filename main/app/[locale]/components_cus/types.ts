import { User } from '@supabase/auth-helpers-react';
import { NXFUser } from '../../store/consoleStore';

export type TopNavbarProps = {
  user?: NXFUser  | null;
  logoUrl?: string | null;
  projectName?: string | null;
};

export type SidebarProps = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

export type Locale = {
  code: string;
  label: string;
  country: string;
};

export type Notification = {
  id: number;
  title: string;
  description: string;
  time: string;
  read: boolean;
};

export type Message = {
  id: number;
  from: string;
  avatar: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
};

// Re-export User for convenience
export type { User };