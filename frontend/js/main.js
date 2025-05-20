// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
import { initCore } from './core/init.js';
import { setupEventListeners } from './core/events.js';
import { runFrontendDiagnostics } from './core/diagnostics.js';

// Импорт UI модулей
import { initializeMainUI } from './ui/uiManager.js'; // Модуль управления UI
import { initializePanelManager } from './ui/panelManager.js'; // Модуль управления панелями
import { initializePromptManager } from './ui/promptManager.js'; // Импорт менеджера промптов
import { initializeVersionManager } from './ui/versionManager.js'; // Импорт менеджера версий
import { initializeGestureAreaVisualization } from './ui/gestureAreaVisualization.js'; // Импорт визуализации области жестов
import { initializeChatDisplay } from './panels/chatMessages.js'; // Импорт инициализации чата (Путь исправлен)

// Импорт аудио модулей
import { initializeSpeechInput } from './audio/speechInput.js';
import { initializeMicrophoneButton } from './audio/microphoneManager.js'; // Модуль управления микрофоном
import { initializeAudioPlayerControls } from './audio/audioFilePlayer.js'; // Модуль управления плеером аудиофайлов
// import { initAudio, setupAudioProcessing } from '/static/js/audio/processing.js'; // TODO: Module for audio processing not found, related code disabled
// import { initAudioVisualization } from '/static/js/audio/visualization.js'; // TODO: Module for audio visualization not found, related code disabled

// Импорт XR модулей
import { initializeXRMode } from './xr/cameraManager.js'; // Модуль управления XR и камерой

// Импорт 3D модулей
import { initializeScene } from './3d/sceneSetup.js'; // Импорт инициализации сцены
import { animate } from './rendering.js'; // Импорт функции анимации

// Импорт мультимодальных модулей
import { initializeMediaPipeHands } from './multimodal/handsTracking.js'; // Инициализация MediaPipe Hands
// import { initializeGestureDetection } from '/static/js/gestures/detection.js'; // TODO: Module for gesture detection not found, related code disabled
// import { initializeHandTracking } from '/static/js/gestures/tracking.js'; // TODO: Module for hand tracking not found, related code disabled

// Импорт AI модулей
import { setupChat } from './ai/chat.js'; // Путь исправлен
import { initializeTria } from './ai/tria.js'; // Путь исправлен

// Импорт обработчиков событий
import { setupDOMEventHandlers } from './core/domEventHandlers.js'; // Импорт модуля обработчиков событий DOM из core
import { initializeResizeHandler } from './core/resizeHandler.js'; // Импорт обработчика изменения размера окна

// Импорт утилит (закомментированы отсутствующие)
// import { loadSettings, saveSettings } from '/static/js/utils/storage.js'; // TODO: Module for storage utils not found, related code disabled
// import { debounce, throttle } from '/static/js/utils/helpers.js'; // TODO: Module for helper utils not found, related code disabled
// TODO: Рассмотреть импорт './utils/fullscreen.js' если он нужен здесь

// Импорт моста для обратной совместимости (закомментирован отсутствующий)
// FINAL CLEANUP (v22): Module legacy-bridge.js or its functionality is missing/disabled
// import { initLegacyBridge, registerLegacyHandlers } from './utils/legacy-bridge.js';

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');

  // 1. Инициализируем ядро приложения (создает state)
  initCore();

  // 2. Инициализируем основные UI компоненты (зависят от state)
  initializeMainUI();
  initializePanelManager();
  initializePromptManager();
  initializeVersionManager();
  initializeGestureAreaVisualization();
  initializeChatDisplay();

  // 3. Инициализируем 3D сцену (зависит от state, UI)
  initializeScene();

  // 4. Инициализируем мультимодальные компоненты (могут зависеть от сцены)
  initializeMediaPipeHands();
  // TODO: Module for gesture detection not found, related code disabled
  // initializeGestureDetection();
  // TODO: Module for hand tracking not found, related code disabled
  // initializeHandTracking();

  // 5. Инициализируем аудио компоненты (могут зависеть от UI)
  initializeMicrophoneButton();
  initializeAudioPlayerControls();
  initializeSpeechInput();
  // TODO: Module for audio processing (e.g., initAudio, initAudioVisualization) not found, related code disabled
  // try {
  //   initAudio();
  //   initAudioVisualization();
  // } catch (error) {
  //   console.error('Ошибка инициализации аудио:', error);
  // }

  // 6. Инициализируем ИИ компоненты (могут зависеть от state, UI)
  initializeTria();
  setupChat();

  // 7. Инициализируем управление XR режимом (может зависеть от сцены)
  initializeXRMode();

  // 8. Устанавливаем обработчики событий (зависят от DOM, state, сцены)
  setupDOMEventHandlers();
  initializeResizeHandler();
  setupEventListeners();

  // 9. Запускаем анимационный цикл
  animate();

  console.log('Инициализация завершена (с отключенными отсутствующими модулями)!');

  // 10. Запускаем диагностику фронтенда
  setTimeout(() => {
    runFrontendDiagnostics();
  }, 1000); // Небольшая задержка для завершения асинхронных операций

  // FINAL CLEANUP (v22): Module legacy-bridge.js or its functionality is missing/disabled
  // try {
  //   initLegacyBridge();
  //   registerLegacyHandlers();
  // } catch (error) {
  //   console.error('Ошибка инициализации legacy bridge:', error);
  // }
});