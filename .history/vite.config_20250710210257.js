// vite.config.js (FINAL, CORRECTED & COMPLETE)
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'frontend',
  server: {
    host: true,
    port: 8000,
    https: { /* Если вы используете mkcert, оставьте эту секцию */ },
    fs: {
      // Разрешаем Vite "смотреть" на уровень выше в корень проекта
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      // Создаем удобное имя ' @holographic-core' для нашего WASM-пакета
      ' @holographic-core': resolve(__dirname, 'holographic_core/pkg')
    }
  }
});