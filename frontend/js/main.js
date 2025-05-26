// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
// frontend/js/main.js - Основная точка входа для приложения

// frontend/js/main.js - Основная точка входа для приложения

// Импорт ядра
import { initCore } from '/static/js/core/init.js';
import { setupEventListeners } from '/static/js/core/events.js';
import { runFrontendDiagnostics } from '/static/js/core/diagnostics.js';

// Импорт UI модулей
import { initializeMainUI } from '/static/js/ui/uiManager.js'; // Модуль управления UI
import { initializePanelManager } from '/static/js/ui/panelManager.js'; // Модуль управления панелями
import { updateHologramLayout } from '/static/js/ui/layoutManager.js'; // Added import
import { initializePromptManager } from '/static/js/ui/promptManager.js'; // Импорт менеджера промптов
import { initializeVersionManager } from '/static/js/ui/versionManager.js'; // Импорт менеджера версий
import { initializeGestureAreaVisualization } from '/static/js/ui/gestureAreaVisualization.js'; // Импорт визуализации области жестов
import { initializeChatDisplay } from '/static/js/panels/chatMessages.js';
// Импорт аудио модулей
import { initializeSpeechInput } from '/static/js/audio/speechInput.js';
import { initializeMicrophoneButton } from '/static/js/audio/microphoneManager.js'; // Модуль управления микрофоном
import { initializeAudioPlayerControls } from '/static/js/audio/audioFilePlayer.js'; // Модуль управления плеером аудиофайлов

// Импорт XR модулей
import { initializeXRMode } from '/static/js/xr/cameraManager.js'; // Модуль управления XR и камерой

// Импорт 3D модулей
import { initializeScene } from '/static/js/3d/sceneSetup.js'; // Импорт инициализации сцены
import { animate } from '/static/js/3d/rendering.js'; // Импорт функции анимации

// Импорт мультимодальных модулей
import { initializeMediaPipeHands } from '/static/js/multimodal/handsTracking.js'; // Инициализация MediaPipe Hands
// Импорт AI модулей
import { setupChat } from '/static/js/ai/chat.js'; // Путь исправлен
import { initializeTria } from '/static/js/ai/tria.js'; // Путь исправлен

// Импорт обработчиков событий
import { setupDOMEventHandlers } from '/static/js/core/domEventHandlers.js'; // Импорт модуля обработчиков событий DOM из core
import { initializeResizeHandler } from '/static/js/core/resizeHandler.js'; // Импорт обработчика изменения размера окна
import { initializeHologramRotationControls } from '/static/js/core/events.js'; // Added import


// Импорт моста для обратной совместимости (закомментирован отсутствующий)
// import { initLegacyBridge, registerLegacyHandlers } from './legacy-bridge.js'; // Закомментировано, т.к. файл отсутствует или функционал не используется

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
  initializeResizeHandler(); // This will set up the resize listener
  setupEventListeners();
  initializeHologramRotationControls(); // Added call
  
  // Initial layout update (after scene and panels are likely initialized)
  updateHologramLayout(false); // Call with handsVisible = false initially

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