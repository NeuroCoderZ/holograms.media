// vite.config.js (ФИНАЛЬНАЯ, АБСОЛЮТНАЯ ВЕРСИЯ)
// DEPLOY VERSION: 1.18.5 - LOCAL SHADERS
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Получаем абсолютный путь к текущей директории
const __dirname = resolve();

export default defineConfig({
  base: '/',
  root: '.',
  server: {
    host: true,
    port: 8000,

    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8001',
        ws: true,
        changeOrigin: true
      },
      '/api': { // Добавляем прокси для HTTP API запросов
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  resolve: {
    alias: {
      '@holographic-core': resolve(__dirname, 'holographic_core/target/pkg')
    }
  },
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID),
    'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(process.env.VITE_ENVIRONMENT || 'development'),
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:5173'),
    'import.meta.env.VITE_AUTH_REDIRECT_URI': JSON.stringify(process.env.VITE_AUTH_REDIRECT_URI),
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // Remove external: ['three'] to bundle it
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  assetsInclude: ['**/*.wasm']
});
