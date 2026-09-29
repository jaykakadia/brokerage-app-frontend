export interface Employee {
  id: number;
  name: string;
  reference_code: string;
  status: 'active' | 'inactive' | string;
  phone?: string | null;
  email?: string | null;
  listings_created: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCreate {
  name: string;
  reference_code: string;
  status?: string;
  phone?: string | null;
  email?: string | null;
}

export interface EmployeeUpdate {
  name?: string;
  reference_code?: string;
  status?: string;
  phone?: string | null;
  email?: string | null;
}

export interface RefCodeItem {
  reference_code: string;
  name: string;
}
