import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.DEV': 'true',
    'process.env.NODE_ENV': '"development"',
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:8143',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});