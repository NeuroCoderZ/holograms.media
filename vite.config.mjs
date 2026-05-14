// vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Получаем абсолютный путь к текущей директории
const __dirname = resolve();

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'wasm/*.wasm'],
      manifest: {
        name: 'Holographic Media',
        short_name: 'Holograms',
        description: 'XR-интерфейс для манипуляции звуком в реальном времени',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 5000000, // Увеличиваем лимит для wasm (5MB)
      }
    })
  ],
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
      external: ['three', /^three\//]
    }
  },
  optimizeDeps: {
    rolldownOptions: {
      target: 'esnext'
    }
  },
  assetsInclude: ['**/*.wasm']
});
