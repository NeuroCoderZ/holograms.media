// vite.config.js (ФИНАЛЬНАЯ, АБСОЛЮТНАЯ ВЕРСИЯ)
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
  build: {
    rollupOptions: {
      external: [
        'three'
      ]
    }
  }
});
