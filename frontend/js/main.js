// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
import { initCore } from './core/init.js'; // Убираем неиспользуемый импорт state
import { setupEventListeners } from './core/events.js';
// import { setupUI } from './core/ui.js'; // Убираем неиспользуемый импорт setupUI
import { runFrontendDiagnostics } from './core/diagnostics.js';

// Импорт UI модулей
import { initializeMainUI } from './ui/uiManager.js'; // Модуль управления UI
import { initializePanelManager } from './ui/panelManager.js'; // Модуль управления панелями

// Импорт аудио модулей
import { initializeSpeechInput } from './audio/speechInput.js';
import { initializeMicrophoneButton } from './audio/microphoneManager.js'; // Модуль управления микрофоном
import { initializeAudioPlayerControls } from './audio/audioFilePlayer.js'; // Модуль управления плеером аудиофайлов

// Импорт XR модулей
import { initializeXRMode } from './xr/cameraManager.js'; // Модуль управления XR и камерой
// import { initAudio, setupAudioProcessing } from '/static/js/audio/processing.js'; // TODO: Module for audio processing not found, related code disabled
// FINAL CLEANUP (v22): Module microphone.js or its functionality is missing/disabled.
// import { initAudioVisualization } from '/static/js/audio/visualization.js'; // TODO: Module for audio visualization not found, related code disabled
// TODO: Рассмотреть импорт './audio/speechInput.js' если он нужен здесь

import { initializeScene } from './3d/sceneSetup.js'; // Импорт инициализации сцены
import { animate } from './rendering.js'; // Импорт функции анимации

// import { initializeGestureDetection } from '/static/js/gestures/detection.js'; // TODO: Module for gesture detection not found, related code disabled
// import { initializeHandTracking } from '/static/js/gestures/tracking.js'; // TODO: Module for hand tracking not found, related code disabled

import { setupChat } from './ai/chat.js'; // Путь исправлен
import { initializeTria } from './ai/tria.js'; // Путь исправлен
import { setupDOMEventHandlers } from './core/domEventHandlers.js'; // Импорт модуля обработчиков событий DOM из core
import { initializeResizeHandler } from './core/resizeHandler.js'; // Импорт обработчика изменения размера окна
import { initializePromptManager } from './ui/promptManager.js'; // Импорт менеджера промптов
import { initializeVersionManager } from './ui/versionManager.js'; // Импорт менеджера версий
import { initializeGestureAreaVisualization } from './ui/gestureAreaVisualization.js'; // Импорт визуализации области жестов
import { initializeChatDisplay } from '/static/js/panels/chatMessages.js'; // Импорт инициализации чата

// import { loadSettings, saveSettings } from '/static/js/utils/storage.js'; // TODO: Module for storage utils not found, related code disabled
// import { debounce, throttle } from '/static/js/utils/helpers.js'; // TODO: Module for helper utils not found, related code disabled
// TODO: Рассмотреть импорт './utils/fullscreen.js' если он нужен здесь

// Импорт моста для обратной совместимости - закомментирован из-за отсутствия модуля
// FINAL CLEANUP (v22): Module legacy-bridge.js or its functionality is missing/disabled
// import { initLegacyBridge, registerLegacyHandlers } from './utils/legacy-bridge.js';

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');
  
  // Инициализируем мост для обратной совместимости
  // FINAL CLEANUP (v22): Module legacy-bridge.js or its functionality is missing/disabled
  // initLegacyBridge(); // Из ./utils/legacy-bridge.js
  // registerLegacyHandlers(); // Из ./utils/legacy-bridge.js

  // Инициализация обработчиков событий DOM
  setupDOMEventHandlers();

  // Инициализируем обработчик изменения размера окна
  initializeResizeHandler();

  // Инициализируем менеджер промптов
  initializePromptManager();

  // Инициализируем менеджер версий
  initializeVersionManager();

  // Инициализируем визуализацию области жестов
  initializeGestureAreaVisualization();

  // Инициализируем отображение чата (DOM)
  initializeChatDisplay();

  // Инициализируем ядро приложения
  initCore(); // Из ./core/init.js
  
  // Инициализируем основной UI (вместо вызова setupUI, который дублирует функциональность)
  initializeMainUI(); // Из ./ui/uiManager.js
  
  // Инициализируем управление панелями
  initializePanelManager(); // Из ./ui/panelManager.js
  
  // Инициализируем кнопку микрофона
  initializeMicrophoneButton(); // Из ./audio/microphoneManager.js

  // Инициализируем плеер аудиофайлов
  initializeAudioPlayerControls(); // Из ./audio/audioFilePlayer.js

  // Инициализируем голосовой ввод (зависит от UI элементов)
  initializeSpeechInput(); // Из ./audio/speechInput.js

  // Инициализируем управление XR режимом
  initializeXRMode(); // Из ./xr/cameraManager.js
  
  // Инициализируем 3D сцену
  initializeScene(); // Вызываем инициализацию сцены

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
  try {
    // initializeHandTracking(); // Перенесено в handsTracking.js
    // initializeGestureDetection(); // TODO: Module for gesture detection not found, related code disabled
    import { initializeMediaPipeHands } from './multimodal/handsTracking.js'; // Инициализация MediaPipe Hands
    initializeMediaPipeHands(); // Инициализация MediaPipe Hands
  } catch (error) {
    console.error('Ошибка инициализации системы жестов:', error);
  }
  
  // Инициализируем ИИ компоненты
  initializeTria(); // Из ./ai/tria.js
  setupChat(); // Из ./ai/chat.js
  
  // Устанавливаем обработчики событий
  setupEventListeners(); // Из ./core/events.js
  
  // Запускаем анимационный цикл
  animate(); // Вызываем функцию анимации

  console.log('Инициализация завершена (с отключенными отсутствующими модулями)!');
  
  // Запускаем диагностику фронтенда
  setTimeout(() => {
    runFrontendDiagnostics();
  }, 1000); // Небольшая задержка для завершения асинхронных операций
});