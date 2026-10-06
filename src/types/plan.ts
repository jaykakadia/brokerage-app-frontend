// 'leads' plans credit leads/listing limit; 'featured' plans feature one listing for duration_days.
export type PlanType = 'leads' | 'featured';

export interface Plan {
  id: number;
  name: string;
  plan_type: PlanType;
  description?: string | null;
  price: number;
  listing_limit: number;
  leads_count: number;
  duration_days: number;
  status: 'active' | 'inactive' | string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanCreate {
  name: string;
  plan_type?: PlanType;
  description?: string;
  price: number;
  listing_limit: number;
  leads_count: number;
  duration_days: number;
  status?: string;
  sort_order?: number;
}

export interface PlanUpdate {
  name?: string;
  plan_type?: PlanType;
  description?: string;
  price?: number;
  listing_limit?: number;
  leads_count?: number;
  duration_days?: number;
  status?: string;
  sort_order?: number;
}
