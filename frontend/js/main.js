// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
import { initCore } from '/static/js/core/init.js';
import { setupEventListeners } from '/static/js/core/events.js';
import { setupUI } from '/static/js/core/ui.js';

// Импорт модулей
import { initAudio, setupAudioProcessing } from '/static/js/audio/processing.js';
import { initMicrophone } from '/static/js/audio/microphone.js';
import { initAudioVisualization } from '/static/js/audio/visualization.js';

import { initScene, setupCamera, animate } from '/static/js/3d/scene.js';
import { createHologram } from '/static/js/3d/hologram.js';
import { initializeGrid } from '/static/js/3d/grid.js';

import { initializeGestureDetection } from '/static/js/gestures/detection.js';
import { initializeHandTracking } from '/static/js/gestures/tracking.js';

import { setupChat } from '/static/js/ai/chat.js';
import { initializeTria } from '/static/js/ai/tria.js';

import { loadSettings, saveSettings } from '/static/js/utils/storage.js';
import { debounce, throttle } from '/static/js/utils/helpers.js';

// Импорт моста для обратной совместимости
import { initLegacyBridge, registerLegacyHandlers } from '/static/js/legacy-bridge.js';

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