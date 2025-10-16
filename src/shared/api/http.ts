import axios from 'axios';
import { getToken, clearSession } from '../../auth/session';

// Resolve origin and optional path prefix from VITE_API_URL.
// - In production: VITE_API_URL is required and must be an absolute URL (can include a path prefix like /meta)
// - In development: VITE_API_URL is optional; when absent, use same-origin (or Vite proxy) without any path prefix.
const { baseOrigin, pathPrefix } = (() => {
  const envValue = import.meta.env.VITE_API_URL as string | undefined;

  const parse = (value: string) => {
    const u = new URL(String(value));
    const origin = u.origin; // protocol + host (+ port)
    // Normalize pathname to a leading-slash, no trailing slash: '/meta' or ''
    const normalizedPath =
      u.pathname && u.pathname !== '/'
        ? `/${u.pathname.replace(/^\/+/, '').replace(/\/+$/, '')}`
        : '';
    return { baseOrigin: origin, pathPrefix: normalizedPath };
  };

  if (import.meta.env.PROD) {
    if (!envValue) {
      throw new Error('VITE_API_URL environment variable is required in production builds.');
    }
    try {
      return parse(envValue);
    } catch {
      throw new Error(`Invalid VITE_API_URL value: ${String(envValue)}`);
    }
  }

  // DEV
  if (envValue) {
    try {
      return parse(envValue);
    } catch {
      // If not a full URL, ignore and fallback to same-origin dev behavior
    }
  }
  // No explicit API URL in dev — use same-origin (or dev proxy), no path prefix
  return { baseOrigin: '', pathPrefix: '' };
})();

export const http = axios.create({
  baseURL: baseOrigin, // origin only; we manage pathPrefix per-request
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor:
// - Inject Authorization header
// - If a pathPrefix exists and request URL is relative to origin (starts with '/'),
//   prepend the prefix so '/api/...' becomes '/meta/api/...'.
http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    if (pathPrefix) {
      const url = String(config.url ?? '');
      // Leave absolute URLs as-is
      const isAbsolute = /^https?:\/\//i.test(url);
      if (!isAbsolute) {
        if (url.startsWith('/')) {
          config.url = `${pathPrefix}${url}`;
        } else if (url) {
          // Relative without a leading slash — normalize to '/<prefix>/<url>'
          config.url = `${pathPrefix}/${url}`.replace(/\/{2,}/g, '/');
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 by clearing session
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearSession();
    }
    return Promise.reject(error);
  }
);
