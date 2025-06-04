// frontend/js/main.js - Основная точка входа для приложения

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js') // Path relative to origin
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// At the top of main.js
import { 
    app as firebaseApp, 
    auth as firebaseAuth, 
    storage as firebaseStorage, 
    firestore as firebaseFirestore 
} from './core/firebaseInit.js'; // Adjust path if main.js is not in frontend/js/

console.log('Firebase services imported in main.js (Task 3/3 Complete):', { firebaseApp, firebaseAuth, firebaseStorage, firebaseFirestore });

import { setAuthDOMElements, initAuthObserver, handleTokenForBackend } from './core/auth.js';

// Импорт ядра
import { initCore, state } from './core/init.js'; // Adjusted path, and import state
import { setupEventListeners } from './core/events.js';
import { runFrontendDiagnostics } from './core/diagnostics.js';

// Импорт UI модулей
import { initializeMainUI } from './ui/uiManager.js'; // Модуль управления UI
import { initChatUI } from './core/ui/chatUI.js'; // Chat UI Initialization
import PanelManager from './ui/panelManager.js'; // Модуль управления панелями
import { updateHologramLayout } from './ui/layoutManager.js'; // Added import
import { initializePromptManager } 
from './ui/promptManager.js'; // Импорт менеджера промптов
import { initializeVersionManager } 
from './ui/versionManager.js'; // Импорт менеджера версий
import { initializeGestureAreaVisualization } 
from './ui/gestureAreaVisualization.js'; // Импорт визуализации области жестов
import { initializeChatDisplay } from './panels/chatMessages.js';
// Импорт аудио модулей
import { initializeSpeechInput } from './audio/speechInput.js';
// import { initializeMicrophoneButton } from './audio/microphoneManager.js'; // Adjusted path and commented out
import { initializeAudioPlayerControls } 
from './audio/audioFilePlayer.js'; // Модуль управления плеером аудиофайлов
import { initAudioVisualization } from './audio/audioVisualizer.js'; // Импорт функции аудио-визуализации

// Импорт XR модулей
import { initializeXRMode } from './xr/cameraManager.js'; // Модуль управления XR и камерой

// Импорт 3D модулей
// import { initializeScene } from '/static/js/3d/sceneSetup.js'; // Removed, handled by initCore
import { animate } from './3d/rendering.js'; // Adjusted path

// Импорт мультимодальных модулей
import { initializeMediaPipeHands } 
from './multimodal/handsTracking.js'; // Инициализация MediaPipe Hands
// Импорт AI модулей
import { setupChat } from './ai/chat.js'; // Путь исправлен
import { initializeTria } from './ai/tria.js'; // Путь исправлен

// Импорт обработчиков событий
import { setupDOMEventHandlers } 
from './core/domEventHandlers.js'; // Импорт модуля обработчиков событий DOM из core
import { initializeResizeHandler } 
from './core/resizeHandler.js'; // Импорт обработчика изменения размера окна
import { initializeHologramRotationControls } 
from './core/events.js'; // Added import


// Импорт моста для обратной совместимости (закомментирован отсутствующий)
// import { initLegacyBridge, registerLegacyHandlers } from './legacy-bridge.js'; // Закомментировано, т.к. файл отсутствует или функционал не используется

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');

  // 1. Инициализируем ядро приложения (создает state, scene, etc.)
  await initCore(); // Made async and awaited

  // 2. Инициализируем основные UI компоненты (зависят от state)
  initializeMainUI();

  // Initialize Auth UI elements
  setAuthDOMElements('signInButton', 'signOutButton', 'userStatus');
  // Initialize Firebase Auth observer and pass callback for token handling
  initAuthObserver(handleTokenForBackend);

  const panelManagerInstance = new PanelManager();
  panelManagerInstance.initializePanelManager();

  initializePromptManager();
  initializeVersionManager();
  initChatUI(); // Initialize Chat UI
  initializeGestureAreaVisualization();
  initializeChatDisplay();

  // 3. Инициализируем 3D сцену (зависит от state, UI) -> Handled by initCore
  // initializeScene(); // Removed

  // 4. Инициализируем мультимодальные компоненты (могут зависеть от сцены)
  initializeMediaPipeHands();
  // TODO: Module for gesture detection not found, related code disabled
  // initializeGestureDetection();
  // 5. Инициализируем аудио компоненты (могут зависеть от UI)
  // initializeMicrophoneButton(); // Commented out
  initializeAudioPlayerControls();
  initializeSpeechInput();
  // TODO: Module for audio processing (e.g., initAudio, initAudioVisualization) not found, related code disabled
  try {
  // initAudio(); // No longer needed directly here, will be handled by audioAnalyzer/audioVisualizer
    // Pass the instances from the state to the audio visualizer
    if (state.audioAnalyzerLeftInstance && state.hologramRendererInstance) {
      initAudioVisualization(state.audioAnalyzerLeftInstance, state.hologramRendererInstance);
    } else {
      console.warn("Audio visualizer could not be fully initialized: missing analyzer or renderer instances.");
    }
  } catch (error) {
    console.error('Ошибка инициализации аудио:', error);
  }

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