// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
import { initCore } from './core/init.js';
import { setupEventListeners } from './core/events.js';
import { setupUI } from './core/ui.js';

// Импорт модулей
import { initAudio, setupAudioProcessing } from './audio/processing.js';
import { initMicrophone } from './audio/microphone.js';
import { initAudioVisualization } from './audio/visualization.js';

import { initScene, setupCamera, animate } from './3d/scene.js';
import { createHologram } from './3d/hologram.js';
import { initializeGrid } from './3d/grid.js';

import { initializeGestureDetection } from './gestures/detection.js';
import { initializeHandTracking } from './gestures/tracking.js';

import { setupChat } from './ai/chat.js';
import { initializeTria } from './ai/tria.js';

import { loadSettings, saveSettings } from './utils/storage.js';
import { debounce, throttle } from './utils/helpers.js';

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
  
  // Инициализируем 3D сцену и визуализацию
  try {
    const { scene, renderer, camera } = initScene();
    initializeGrid(scene);
    createHologram(scene);
  } catch (error) {
    console.error('Ошибка инициализации 3D сцены:', error);
    // Продолжаем без 3D функциональности
  }
  
  // Инициализируем аудио
  try {
    initAudio();
    initAudioVisualization();
  } catch (error) {
    console.error('Ошибка инициализации аудио:', error);
    // Продолжаем без аудио функциональности
  }
  
  // Инициализируем систему отслеживания жестов
  try {
    initializeHandTracking();
    initializeGestureDetection();
  } catch (error) {
    console.error('Ошибка инициализации системы жестов:', error);
    // Продолжаем без функциональности жестов
  }
  
  // Инициализируем ИИ компоненты
  initializeTria();
  setupChat();
  
  // Устанавливаем обработчики событий
  setupEventListeners();
  
  // Запускаем анимационный цикл
  try {
    animate();
  } catch (error) {
    console.error('Ошибка запуска анимационного цикла:', error);
  }
  
  console.log('Инициализация завершена!');
}); 