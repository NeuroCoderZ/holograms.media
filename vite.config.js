import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    open: true,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: 'dist', // Changed from ../dist
    target: 'esnext',
    rollupOptions: {
      input: {
        main: '/index.html' // Явно указываем точку входа
      }
    }
  },
});