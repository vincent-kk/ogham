import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5174',
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
