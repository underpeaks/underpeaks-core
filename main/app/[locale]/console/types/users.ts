// ============================================================
// FILE: app/types/users.ts
// PURPOSE: Type definitions matching the actual nxf_users
//          schema exactly.
// ============================================================

export type UserRole   = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended' | 'disabled';

export interface NxfUser {
  user_id:        string;
  user_email:     string;
  password_hash?: string;
  full_name?:     string;
  role:           UserRole;
  email_verified?: boolean;
  token?:         string;
  token_ttl?:     string;
  status:         UserStatus;
  notes?:         string;
  is_logged_in?:  boolean;
  last_login?:    string;
  created_at?:    string;
  updated_at?:    string;
}

// What the list view renders per row
export interface UserListRow {
  user_id:         string;
  display_name:    string;   // derived from full_name or email prefix
  full_name?:      string;
  user_email:      string;
  role:            UserRole;
  status:          UserStatus;
  created_at?:     string;
  last_login?:     string;
  is_logged_in?:   boolean;
  avatar_initials: string;
  avatar_colour:   string;
}

export interface LoginHistoryEvent {
  sal_id:     string;
  user_id:    string;
  action:     'user_login' | 'user_logout' | 'user_online' | 'user_offline';
  context: {
    ip?:      string;
    browser?: string;
    os?:      string;
    device?:  string;
    location?: string;
  } | null;
  created_at: string;
}

export interface UserDetail extends NxfUser {
  login_history: LoginHistoryEvent[];
}

export interface UpdateUserPayload {
  role?:   UserRole;
  status?: UserStatus;
}

export type SortField =
  | 'display_name'
  | 'user_email'
  | 'role'
  | 'status'
  | 'created_at'
  | 'last_login';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field:     SortField;
  direction: SortDirection;
}

export interface FilterState {
  role:      UserRole | 'all';
  status:    UserStatus | 'all';
  dateFrom?: string;
  dateTo?:   string;
}