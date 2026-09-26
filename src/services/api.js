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

export default api;

