import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    open: true,
  },
  // Мы все еще оставляем это на случай проблем с top-level await
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    // ИСКЛЮЧАЕМ three из оптимизации Vite
    exclude: ['three'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
});