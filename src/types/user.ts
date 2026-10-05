export type CanonicalRole = 'Owner' | 'Agent' | 'Builder' | 'Admin';

export function isCanonicalRole(val: string): val is CanonicalRole {
  return val === 'Owner' || val === 'Agent' || val === 'Builder' || val === 'Admin';
}

export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  role: CanonicalRole;
  status: 'active' | 'suspended' | 'deleted' | string;
  plan_id?: number | null;
  listing_limit: number;
  leads_balance: number;
  leads_used: number;
  plan_expires_at?: string | null;
  business_name?: string | null;
  whatsapp?: string | null;
  facebook_url?: string | null;
  website_url?: string | null;
  x_url?: string | null;
  youtube_url?: string | null;
  created_at: string;
}

export interface UserProfileUpdate {
  name?: string;
  phone?: string;
  email?: string;
  otp?: string;
  business_name?: string;
  whatsapp?: string;
  facebook_url?: string;
  website_url?: string;
  x_url?: string;
  youtube_url?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AdminUserCreate {
  name: string;
  phone: string;
  email: string;
  password: string;
  role?: CanonicalRole;
  status?: string;
  plan_id?: number | null;
  leads_balance?: number;
  plan_expires_at?: string | null;
}

export interface AdminUserUpdate {
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  role?: CanonicalRole;
  status?: string;
  plan_id?: number | null;
  leads_balance?: number | null;
  plan_expires_at?: string | null;
}
