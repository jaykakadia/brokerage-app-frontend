import { User, CanonicalRole } from './user';

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirm_password?: string;
  role?: CanonicalRole;
  otp?: string;
}

export interface SendOtpRequest {
  email: string;
  action?: 'register' | 'forgot' | 'profile_update' | string;
  name?: string;
  phone?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  new_password: string;
  otp?: string;
}

export interface AuthResponse {
  status: 'success' | 'error' | string;
  message: string;
  redirect?: string | null;
  csrf_token?: string | null;
  user?: User | null;
}
