import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
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
        const { data } = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
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
