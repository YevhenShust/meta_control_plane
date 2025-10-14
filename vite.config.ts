import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Allow using process.env without pulling in @types/node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;

const proxyTarget = (process?.env?.VITE_PROXY_TARGET as string | undefined) || undefined;
const serverConfig: UserConfig['server'] = proxyTarget
  ? {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          // Allow self-signed certs when using https local backends
          secure: false,
        },
      },
    }
  : {};
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.DEV': 'true',
    'process.env.NODE_ENV': '"development"',
  },
  server: serverConfig,
});