export interface LeadStatusResponse {
  status: string;
  leads_balance: number;
  leads_used: number;
  plan_id?: number | null;
  plan_expires_at?: string | null;
}

export interface RevealContactRequest {
  listing_id: number;
}

export interface RevealContactInfo {
  person?: string;
  name?: string;
  owner_name?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  [key: string]: string | undefined;
}

export interface RevealPlanInfo {
  leads_remaining?: number;
  leads_balance?: number;
  leads_used?: number;
  leads_total?: number;
  [key: string]: number | undefined;
}

export interface RevealContactResponse {
  status: string;
  code?: string;
  message?: string;
  contact?: RevealContactInfo;
  plan?: RevealPlanInfo;
  already_revealed?: boolean;
}
