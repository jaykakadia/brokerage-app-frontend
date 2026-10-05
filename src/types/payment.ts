import { Plan } from './plan';

export interface CreateOrderRequest {
  plan_id: number;
  listing_id?: number; // required for featured plans
  idempotency_key?: string;
}

export type CashfreeMode = 'sandbox' | 'production';

export interface CreateOrderResponse {
  status: string;
  order_id: string;
  payment_session_id: string;
  environment: CashfreeMode | 'mock';
  amount: number; // in rupees
  currency: string;
  plan: Plan;
}

export interface VerifyPaymentRequest {
  order_id: string;
}

export interface VerifyPaymentResponse {
  status: string;
  message: string;
  plan: {
    id?: number;
    name?: string;
    listing_limit?: number;
    leads_count?: number;
    duration_days?: number;
    [key: string]: unknown;
  };
}

export interface Order {
  id: number;
  user_id?: number | null;
  plan_id?: number | null;
  cashfree_order_id: string;
  cashfree_payment_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface CashfreeSettings {
  app_id?: string;
  has_secret?: boolean;
  environment?: CashfreeMode;
}

export interface CashfreeSettingsUpdate {
  app_id?: string;
  secret_key?: string;
  environment?: CashfreeMode;
}
