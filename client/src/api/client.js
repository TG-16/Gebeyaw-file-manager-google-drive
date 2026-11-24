import axios from 'axios';

// Base backend URL: defaults to https://backend.filemanager.gebeyawsolar.com in production,
// and empty string in local dev (which leverages Vite's dev proxy)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '') 
  : '';

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true // send HTTP-only cookies (refresh token)
});

let accessToken = localStorage.getItem('accessToken') || null;

export const setAuthToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

export const getAuthToken = () => accessToken;

// Request interceptor to attach Bearer token
api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor to handle silent token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {}, { withCredentials: true });
        setAuthToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setAuthToken(null);
        window.dispatchEvent(new Event('auth:expired'));
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
