import { CanonicalRole } from './user';

export interface ListingImage {
  id: number;
  file_path: string;
  original_filename?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  sort_order: number;
  created_at: string;
}

export interface ListingFormData {
  city?: string;
  type?: string;
  category?: string;
  sub_category?: string;
  purpose?: string;
  state?: string;
  furnishing?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  builtup_area?: string | number;
  carpet_area?: string | number;
  total_area?: string | number;
  unit?: string;
  price_unit?: string;
  price_negotiable?: boolean | string;
  floor?: string | number;
  total_floors?: string | number;
  facing?: string;
  property_age?: string;
  gated_security?: boolean | string;
  car_parking?: string | number;
  available_from?: string;
  amenities?: string[];
  ownership_type?: string;
  rera_approved?: boolean | string;
  rera_number?: string;
  tags?: string[];
  whatsapp?: string;
  views?: number;
  propType?: string;
  listingType?: string;
  [key: string]: unknown;
}

export interface Listing {
  id: number;
  title: string;
  location: string;
  price: number;
  description?: string | null;
  owner_name: string;
  owner_role: CanonicalRole;
  owner_phone?: string | null;
  owner_email?: string | null;
  reference_code?: string | null;
  form_data?: ListingFormData | null;
  user_id: number;
  status: 'pending' | 'approved' | 'suspended' | 'sold' | 'rented' | 'deleted' | string;
  verified: number;
  is_featured?: boolean;
  created_at: string;
  images: ListingImage[];
}

export interface ListingCounts {
  pending: number;
  approved: number;
  suspended: number;
  sold: number;
  rented: number;
  deleted: number;
  [key: string]: number;
}

export interface ListingCountsResponse {
  status: string;
  data: ListingCounts;
}

export interface ListingStatsResponse {
  active_listings: number;
  featured_listings: number;
  cities_covered: number;
  registered_users: number;
}

export interface ListingRefSummaryItem {
  reference_code: string;
  total: number;
}

export interface ListingsApiResponse {
  status: string;
  data: Listing[];
  ref_summary?: ListingRefSummaryItem[];
}

export interface ListingStatusUpdatePayload {
  action: 'approve' | 'pending' | 'suspended' | 'sold' | 'rented' | 'delete' | 'stamp' | string;
}
