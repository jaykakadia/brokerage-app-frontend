export interface Plan {
  id: number;
  name: string;
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
  description?: string;
  price?: number;
  listing_limit?: number;
  leads_count?: number;
  duration_days?: number;
  status?: string;
  sort_order?: number;
}
