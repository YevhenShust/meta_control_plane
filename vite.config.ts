import { defineConfig, loadEnv } from 'vite';
import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Allow using process.* without pulling in @types/node
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const process: any;

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = (env.VITE_PROXY_TARGET as string | undefined) || (process?.env?.VITE_PROXY_TARGET as string | undefined) || undefined;

  const server: UserConfig['server'] = proxyTarget
    ? {
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            // Allow self-signed certs when using https local backends
            secure: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            configure: (proxy: any) => {
              const log = (msg: string) => {
                try {
                  process?.stdout?.write(msg + '\n');
                } catch {
                  // ignore logging errors
                }
              };
              // Helpful debug logs to see where requests are proxied in dev
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              proxy.on('proxyReq', (_proxyReq: any, req: any) => {
                log(`[proxy] ${req?.method} ${req?.url} -> ${proxyTarget}`);
              });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              proxy.on('proxyRes', (proxyRes: any, req: any) => {
                log(`[proxy] ${req?.method} ${req?.url} <- ${proxyRes?.statusCode} ${proxyTarget}`);
              });
            },
          },
        },
      }
    : undefined;

  // Basic startup hint
  try {
    process?.stdout?.write(`[vite] mode=${mode}; VITE_PROXY_TARGET=${proxyTarget ?? '(none)'}\n`);
  // eslint-disable-next-line no-empty
  } catch {}

  return {
    plugins: [react()],
    // In dev, you may set VITE_PROXY_TARGET to proxy /api -> backend
    server,
  };
});