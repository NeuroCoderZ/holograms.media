import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    open: true,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    target: 'esnext',
  },
});