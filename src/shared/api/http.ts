import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:8100';

export const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// (не чіпай далі, інтерсептори додамо потім за потреби)
