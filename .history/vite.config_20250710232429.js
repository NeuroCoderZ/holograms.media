// vite.config.js (ФИНАЛЬНАЯ, АБСОЛЮТНАЯ ВЕРСИЯ)
import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Получаем абсолютный путь к текущей директории
const __dirname = resolve();

export default defineConfig({
  root: 'frontend',
  server: {
    host: true,
    port: 8000,
    https: {
      // --- КРИТИЧЕСКИ ВАЖНОЕ ИСПРАВЛЕНИЕ: АБСОЛЮТНЫЕ ПУТИ ---
      key: fs.readFileSync(resolve(__dirname, 'localhost+4-key.pem')),
      cert: fs.readFileSync(resolve(__dirname, 'localhost+4.pem'))
    }
  },
  resolve: {
    alias: {
      '@holographic-core': resolve(__dirname, 'holographic_core/target')
    }
  }
});
