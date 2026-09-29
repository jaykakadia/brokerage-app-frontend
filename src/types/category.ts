export interface Category {
  id: number;
  name: string;
  slug?: string;
  icon_class?: string | null;
  description?: string | null;
  total_listings?: number;
  created_at?: string;
}

export interface CategoryCreate {
  name: string;
  slug?: string;
  icon_class?: string | null;
  description?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  icon_class?: string | null;
  description?: string | null;
}
