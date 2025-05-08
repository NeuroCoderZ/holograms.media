// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
import { initCore } from './core/init.js';
import { setupEventListeners } from './core/events.js';
import { setupUI } from './core/ui.js';

// Импорт модулей (только существующие)
import { setupChat } from './ai/chat.js';
import { initializeTria } from './ai/tria.js';

// Импорт моста для обратной совместимости
import { initLegacyBridge, registerLegacyHandlers } from './legacy-bridge.js';

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');
  
  // Инициализируем мост для обратной совместимости
  initLegacyBridge();
  registerLegacyHandlers();
  
  // Инициализируем ядро приложения
  initCore();
  setupUI();
  
  // Инициализируем ИИ компоненты
  initializeTria();
  setupChat();
  
  // Устанавливаем обработчики событий
  setupEventListeners();
  
  console.log('Инициализация завершена!');
});