import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Backend port for the dev /api proxy. The Makefile `dev-frontend` target sets
// this from .dashboard-runtime.json (the port the backend actually bound), so
// the proxy follows the backend even when it auto-steps past a busy 5174.
const apiPort = Number(process.env.DASHBOARD_API_PORT) || 5174;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // auto-step to the next port if 5173 is busy
    open: true, // open the browser when the dev server starts
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) =>
            proxyReq.setHeader('connection', 'keep-alive'),
          );
        },
      },
    },
  },
  build: {
    outDir: '../backend/app/static',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
  },
});
