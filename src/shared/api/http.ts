import axios from 'axios';
import { getToken, clearSession } from '../../auth/session';

// Base URL strategy:
// - In development: allow empty string to use Vite proxy (relative /api requests)
// - In production: require VITE_API_URL to be set to an absolute backend URL
const resolvedBaseURL = (() => {
  const envValue = import.meta.env.VITE_API_URL as string | undefined;
  if (import.meta.env.PROD) {
    if (!envValue) {
      throw new Error('VITE_API_URL environment variable is required in production builds.');
    }
    return String(envValue).replace(/\/+$/, '');
  }
  // DEV fallback to proxy if not provided
  return envValue ? String(envValue).replace(/\/+$/, '') : '';
})();

export const http = axios.create({
  baseURL: resolvedBaseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: inject Authorization header if token exists
http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 by clearing session
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);
