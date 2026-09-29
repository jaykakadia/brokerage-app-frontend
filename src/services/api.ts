import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  MessageResponse,
  ApiErrorResponse,
  Listing,
  Plan,
  PlanCreate,
  PlanUpdate,
  LeadStatusResponse,
  RevealContactResponse,
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  RazorpaySettings,
  RazorpaySettingsUpdate,
  RoleLimitsMap,
  RoleLimit,
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  RefCodeItem,
  Blog,
  MailSettings,
  MailSettingsUpdate,
  ToggleWishlistResponse
} from '../types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // Send and receive HTTP-only cookies
  headers: {
    'Accept': 'application/json'
  }
});

let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null): void => {
  csrfToken = token;
};

export const getCsrfToken = async (): Promise<string | null> => {
  if (csrfToken) return csrfToken;
  try {
    const res = await api.get<{ csrf_token?: string }>('/api/v1/auth/csrf');
    if (res.data?.csrf_token) {
      csrfToken = res.data.csrf_token;
      return csrfToken;
    }
  } catch (err: unknown) {
    console.error('Failed to obtain CSRF token', err);
  }
  return null;
};

// Request interceptor to attach CSRF token on state-changing calls
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase();
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    const token = await getCsrfToken();
    if (token) {
      config.headers.set('X-CSRF-Token', token);
    }
  }
  return config;
});

export const getImageUrl = (path?: string | null): string => {
  if (!path) return '/placeholder-property.svg';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath.startsWith('/uploads')) {
    const apiBase = import.meta.env.VITE_API_URL || '';
    return `${apiBase}${cleanPath}`;
  }
  return cleanPath;
};

/**
 * Safely extracts human-readable error message from an unknown error or Axios error.
 */
export function getApiErrorMessage(error: unknown, fallback = 'An unexpected error occurred'): string {
  if (!error) return fallback;
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const resp = data as ApiErrorResponse;
      if (typeof resp.detail === 'string') return resp.detail;
      if (Array.isArray(resp.detail) && resp.detail.length > 0) {
        const first = resp.detail[0];
        if (first?.msg) return first.msg;
      }
      if (typeof resp.message === 'string') return resp.message;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

// --- Phase 2 API Endpoints ---

// Wishlist
export function getWishlist(idsOnly: true): Promise<AxiosResponse<ApiResponse<number[]>>>;
export function getWishlist(idsOnly?: false): Promise<AxiosResponse<ApiResponse<Listing[]>>>;
export function getWishlist(idsOnly?: boolean): Promise<AxiosResponse<ApiResponse<Listing[] | number[]>>> {
  return api.get('/api/v1/wishlist', { params: { ids_only: idsOnly } });
}

export const toggleWishlist = (listingId: number): Promise<AxiosResponse<ToggleWishlistResponse>> =>
  api.post('/api/v1/wishlist/toggle', { listing_id: listingId });

// Plans
export const getPlans = (all = false): Promise<AxiosResponse<ApiResponse<Plan[]>>> =>
  api.get('/api/v1/plans', { params: { all: all ? 1 : 0 } });

export const createPlan = (planData: PlanCreate): Promise<AxiosResponse<ApiResponse<Plan>>> =>
  api.post('/api/v1/plans', planData);

export const updatePlan = (planId: number, planData: PlanUpdate): Promise<AxiosResponse<ApiResponse<Plan>>> =>
  api.put(`/api/v1/plans/${planId}`, planData);

export const deletePlan = (planId: number): Promise<AxiosResponse<MessageResponse>> =>
  api.delete(`/api/v1/plans/${planId}`);

// Leads
export const getLeadStatus = (): Promise<AxiosResponse<LeadStatusResponse>> =>
  api.get('/api/v1/leads/status');

export const revealContact = (listingId: number): Promise<AxiosResponse<RevealContactResponse>> =>
  api.post('/api/v1/leads/reveal', { listing_id: listingId });

// Payments & Razorpay
export const createPaymentOrder = (planId: number): Promise<AxiosResponse<CreateOrderResponse>> =>
  api.post('/api/v1/payments/create-order', { plan_id: planId });

export const verifyPayment = (payload: VerifyPaymentRequest): Promise<AxiosResponse<VerifyPaymentResponse>> =>
  api.post('/api/v1/payments/verify', payload);

export const getRazorpaySettings = (): Promise<AxiosResponse<ApiResponse<RazorpaySettings>>> =>
  api.get('/api/v1/payments/admin/settings');

export const saveRazorpaySettings = (payload: RazorpaySettingsUpdate): Promise<AxiosResponse<ApiResponse<RazorpaySettings>>> =>
  api.post('/api/v1/payments/admin/settings', payload);

// --- Phase 3 API Endpoints ---

// Role Limits
export const getRoleLimits = (): Promise<AxiosResponse<ApiResponse<RoleLimitsMap | RoleLimit[]>>> =>
  api.get('/api/v1/admin/role-limits');

export const saveRoleLimits = (limits: RoleLimitsMap | { limits: RoleLimitsMap }): Promise<AxiosResponse<ApiResponse<RoleLimitsMap>>> => {
  const payload = 'limits' in limits ? limits : { limits };
  return api.post('/api/v1/admin/role-limits', payload);
};

// Field Associates / Employees
export const getEmployees = (): Promise<AxiosResponse<ApiResponse<Employee[]>>> =>
  api.get('/api/v1/employees');

export const getEmployee = (id: number | string): Promise<AxiosResponse<ApiResponse<Employee>>> =>
  api.get(`/api/v1/employees/${id}`);

export const saveEmployee = (empData: EmployeeCreate | EmployeeUpdate | FormData): Promise<AxiosResponse<ApiResponse<Employee>>> =>
  api.post('/api/v1/employees', empData);

export const deleteEmployee = (id: number | string): Promise<AxiosResponse<MessageResponse>> =>
  api.delete(`/api/v1/employees/${id}`);

export const getRefCodes = (): Promise<AxiosResponse<ApiResponse<RefCodeItem[]>>> =>
  api.get('/api/v1/employees/ref-codes');

// Blogs
export const getBlogs = (): Promise<AxiosResponse<ApiResponse<Blog[]>>> =>
  api.get('/api/v1/blogs');

export const getBlogDetail = (slugOrId: string | number): Promise<AxiosResponse<ApiResponse<Blog>>> =>
  api.get(`/api/v1/blogs/detail/${slugOrId}`);

export const getAdminBlogs = (): Promise<AxiosResponse<ApiResponse<Blog[]>>> =>
  api.get('/api/v1/admin/blogs/all');

export const getAdminBlog = (id: number | string): Promise<AxiosResponse<ApiResponse<Blog>>> =>
  api.get(`/api/v1/admin/blogs/${id}`);

export const saveAdminBlog = (formData: FormData): Promise<AxiosResponse<ApiResponse<Blog>>> =>
  api.post('/api/v1/admin/blogs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const deleteAdminBlog = (id: number | string): Promise<AxiosResponse<MessageResponse>> =>
  api.delete(`/api/v1/admin/blogs/${id}`);

// Mail Configuration (SMTP)
export const getMailSettings = (): Promise<AxiosResponse<ApiResponse<MailSettings>>> =>
  api.get('/api/v1/admin/settings/mail');

export const saveMailSettings = (settings: MailSettingsUpdate): Promise<AxiosResponse<ApiResponse<MailSettings>>> =>
  api.post('/api/v1/admin/settings/mail', settings);

export const sendTestMail = (testEmail: string): Promise<AxiosResponse<MessageResponse>> =>
  api.post('/api/v1/admin/settings/mail/test', { test_email: testEmail });

export default api;
