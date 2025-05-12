// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
import { initCore } from './core/init.js'; // Путь исправлен
import { setupEventListeners } from './core/events.js'; // Путь исправлен
import { setupUI } from './core/ui.js'; // Путь исправлен

// Импорт модулей
// import { initAudio, setupAudioProcessing } from '/static/js/audio/processing.js'; // TODO: Module for audio processing not found, related code disabled
// import { initMicrophone } from '/static/js/audio/microphone.js'; // TODO: Module for microphone not found, related code disabled
// import { initAudioVisualization } from '/static/js/audio/visualization.js'; // TODO: Module for audio visualization not found, related code disabled
// TODO: Рассмотреть импорт './audio/speechInput.js' если он нужен здесь

// import { initScene, setupCamera, animate } from '/static/js/3d/scene.js'; // TODO: Module for 3D scene not found, related code disabled
// import { createHologram } from '/static/js/3d/hologram.js'; // TODO: Module for 3D hologram not found, related code disabled
// import { initializeGrid } from '/static/js/3d/grid.js'; // TODO: Module for 3D grid not found, related code disabled

// import { initializeGestureDetection } from '/static/js/gestures/detection.js'; // TODO: Module for gesture detection not found, related code disabled
// import { initializeHandTracking } from '/static/js/gestures/tracking.js'; // TODO: Module for hand tracking not found, related code disabled

import { setupChat } from './ai/chat.js'; // Путь исправлен
import { initializeTria } from './ai/tria.js'; // Путь исправлен

// import { loadSettings, saveSettings } from '/static/js/utils/storage.js'; // TODO: Module for storage utils not found, related code disabled
// import { debounce, throttle } from '/static/js/utils/helpers.js'; // TODO: Module for helper utils not found, related code disabled
// TODO: Рассмотреть импорт './utils/fullscreen.js' если он нужен здесь

// Импорт моста для обратной совместимости - закомментирован из-за отсутствия модуля
// FINAL CLEANUP: Module legacy-bridge.js or its functionality is missing/disabled
// import { initLegacyBridge, registerLegacyHandlers } from './utils/legacy-bridge.js';

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');
  
  // Инициализируем мост для обратной совместимости
  // FINAL CLEANUP: Module legacy-bridge.js or its functionality is missing/disabled
  // initLegacyBridge(); // Из ./utils/legacy-bridge.js
  // registerLegacyHandlers(); // Из ./utils/legacy-bridge.js
  
  // Инициализируем ядро приложения
  initCore(); // Из ./core/init.js
  setupUI(); // Из ./core/ui.js
  
  // Инициализируем 3D сцену и визуализацию
  // TODO: Module for 3D scene (e.g., initScene, initializeGrid, createHologram) not found, related code disabled
  // try {
  //   const { scene, renderer, camera } = initScene();
  //   initializeGrid(scene);
  //   createHologram(scene);
  // } catch (error) {
  //   console.error('Ошибка инициализации 3D сцены:', error);
  // }
  
  // Инициализируем аудио
  // TODO: Module for audio processing (e.g., initAudio, initAudioVisualization) not found, related code disabled
  // try {
  //   initAudio();
  //   initAudioVisualization();
  // } catch (error) {
  //   console.error('Ошибка инициализации аудио:', error);
  // }
  
  // Инициализируем систему отслеживания жестов
  // TODO: Module for gestures (e.g., initializeHandTracking, initializeGestureDetection) not found, related code disabled
  // try {
  //   initializeHandTracking();
  //   initializeGestureDetection();
  // } catch (error) {
  //   console.error('Ошибка инициализации системы жестов:', error);
  // }
  
  // Инициализируем ИИ компоненты
  initializeTria(); // Из ./ai/tria.js
  setupChat(); // Из ./ai/chat.js
  
  // Устанавливаем обработчики событий
  setupEventListeners(); // Из ./core/events.js
  
  // Запускаем анимационный цикл
  // TODO: Module for 3D scene (animate) not found, related code disabled
  // try {
  //   animate();
  // } catch (error) {
  //   console.error('Ошибка запуска анимационного цикла:', error);
  // }
  
  console.log('Инициализация завершена (с отключенными отсутствующими модулями)!');
});