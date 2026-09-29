export interface Location {
  id: number;
  city_name: string;
  state: string;
  category?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

export interface LocationCreate {
  city_name: string;
  state?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationUpdate {
  city_name?: string;
  state?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
}
