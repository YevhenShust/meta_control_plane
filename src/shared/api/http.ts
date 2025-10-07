import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:8100';

export const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Add a request interceptor to log outgoing requests for debugging
http.interceptors.request.use((config) => {
  try {
    const { method, url, params, data } = config;
    // Only log small previews to avoid leaking large payloads
    const dataPreview = typeof data === 'string' ? data.slice(0, 2000) : JSON.stringify(data)?.slice(0, 2000);
    console.debug('[http] outgoing request', { method, url, params, dataPreview });
  } catch (e) {
    console.debug('[http] outgoing request preview error', e);
  }
  return config;
});

// (інтерсептори додані для дебагу; можна видалити пізніше)
