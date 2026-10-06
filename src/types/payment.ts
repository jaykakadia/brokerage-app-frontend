import { Plan } from './plan';

export interface CreateOrderRequest {
  plan_id: number;
  listing_id?: number; // required for featured plans
  idempotency_key?: string;
}

export interface CreateOrderResponse {
  status: string;
  key_id: string;
  amount: number; // in paise
  currency: string;
  order_id: string;
  plan: Plan;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan_id?: number;
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
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface RazorpaySettings {
  razorpay_key_id?: string;
  key_id?: string;
  has_secret?: boolean;
  has_webhook_secret?: boolean;
  test_mode?: boolean;
}

export interface RazorpaySettingsUpdate {
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  key_id?: string;
  key_secret?: string;
  webhook_secret?: string;
  test_mode?: boolean;
}
