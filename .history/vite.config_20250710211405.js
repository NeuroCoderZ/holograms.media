// vite.config.js (ФИНАЛЬНАЯ, ПРАВИЛЬНАЯ ВЕРСИЯ)
import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  // Указываем, что корень фронтенда находится в папке 'frontend'
  root: 'frontend',
  server: {
    host: true, // Делаем сервер доступным по сети
    port: 8000,
    // --- КРИТИЧЕСКИ ВАЖНОЕ ИСПРАВЛЕНИЕ ---
    // Указываем Vite использовать наши сгенерированные mkcert сертификаты
    https: {
      key: fs.readFileSync('../localhost+4-key.pem'), // Путь от `root` ('frontend') к корню
      cert: fs.readFileSync('../localhost+4.pem')     // Путь от `root` ('frontend') к корню
    }
  },
  resolve: {
    alias: {
      // Этот alias нужен, чтобы `import` мог найти наш WASM-модуль
      '@holographic-core': resolve(__dirname, 'holographic_core/pkg')
    }
  }
});