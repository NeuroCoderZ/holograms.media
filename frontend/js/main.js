// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра (существующие модули)
import { initCore } from './core/init.js';
import { setupEventListeners } from './core/events.js';
import { setupUI } from './core/ui.js';

// Импорт AI модулей (существующие)
import { setupChat } from './ai/chat.js';
import { initializeTria } from './ai/tria.js';

// Импорт панелей (существующие)
import './panels/chatMessages.js';
import './panels/rightPanelManager.js';

// Импорт утилит (существующие)
import { toggleFullscreen } from './utils/fullscreen.js';

// TODO: Следующие модули временно отсутствуют:
// - 3D: scene.js, hologram.js, grid.js
// - Gestures: detection.js, tracking.js
// - Utils: storage.js, helpers.js

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');
  
  // Инициализируем ядро приложения
  initCore();
  setupUI();
  
  // TODO: 3D функциональность временно отключена
  console.log('[INFO] 3D функциональность временно отключена - отсутствуют необходимые модули');
  
  // TODO: Система жестов временно отключена
  console.log('[INFO] Система жестов временно отключена - отсутствуют необходимые модули');
  
  // Инициализируем ИИ компоненты
  initializeTria();
  setupChat();
  
  // Устанавливаем обработчики событий
  setupEventListeners();
  
  console.log('Инициализация завершена!');
});