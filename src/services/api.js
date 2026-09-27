import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // Send and receive HTTP-only cookies
  headers: {
    'Accept': 'application/json'
  }
});

let csrfToken = null;

export const setCsrfToken = (token) => {
  csrfToken = token;
};

export const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  try {
    const res = await api.get('/api/v1/auth/csrf');
    if (res.data?.csrf_token) {
      csrfToken = res.data.csrf_token;
      return csrfToken;
    }
  } catch (err) {
    console.error('Failed to obtain CSRF token', err);
  }
  return null;
};

// Request interceptor to attach CSRF token on state-changing calls
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    const token = await getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

export const getImageUrl = (path) => {
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

// --- Phase 2 API Endpoints ---

// Wishlist
export const getWishlist = (idsOnly = false) =>
  api.get('/api/v1/wishlist', { params: { ids_only: idsOnly } });

export const toggleWishlist = (listingId) =>
  api.post('/api/v1/wishlist/toggle', { listing_id: listingId });

// Plans
export const getPlans = (all = false) =>
  api.get('/api/v1/plans', { params: { all: all ? 1 : 0 } });

export const createPlan = (planData) =>
  api.post('/api/v1/plans', planData);

export const updatePlan = (planId, planData) =>
  api.put(`/api/v1/plans/${planId}`, planData);

export const deletePlan = (planId) =>
  api.delete(`/api/v1/plans/${planId}`);

// Leads
export const getLeadStatus = () =>
  api.get('/api/v1/leads/status');

export const revealContact = (listingId) =>
  api.post('/api/v1/leads/reveal', { listing_id: listingId });

// Payments & Razorpay
export const createPaymentOrder = (planId) =>
  api.post('/api/v1/payments/create-order', { plan_id: planId });

export const verifyPayment = (payload) =>
  api.post('/api/v1/payments/verify', payload);

export const getRazorpaySettings = () =>
  api.get('/api/v1/payments/admin/settings');

export const saveRazorpaySettings = (payload) =>
  api.post('/api/v1/payments/admin/settings', payload);

export default api;

