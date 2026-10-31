import axios from 'axios';

// Cookies carry auth, so the browser attaches them automatically with withCredentials.
// The CSRF token is a non-httpOnly cookie that we read and echo back in a header
// (double-submit pattern). The server sets it on the first GET.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = readCookie('csas_csrf');
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

// On a 401 with an expired access token, silently refresh once and retry. A failed
// refresh (or any other 401) is surfaced so the AuthProvider can send the user to login.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response || !config || config._retried) throw error;
    const code = response.data?.code;
    const isAuthEndpoint = config.url?.includes('/auth/refresh') || config.url?.includes('/auth/login');
    if (response.status === 401 && code === 'TOKEN_EXPIRED' && !isAuthEndpoint) {
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        await refreshing;
        refreshing = null;
        config._retried = true;
        return api(config);
      } catch (refreshErr) {
        refreshing = null;
        throw refreshErr;
      }
    }
    throw error;
  }
);

export const apiMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || fallback;

export default api;
