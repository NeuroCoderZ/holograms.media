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
import { initializeHammerGestures } from './core/gestures.js'; // Added import


// Импорт моста для обратной совместимости (закомментирован отсутствующий)
// import { initLegacyBridge, registerLegacyHandlers } from './legacy-bridge.js'; // Закомментировано, т.к. файл отсутствует или функционал не используется

// Variables for hologram rotation
let isDragging = false;
let startPointerX = 0;
let startPointerY = 0; // Added for X-axis rotation
let startRotationY = 0;
let startRotationX = 0; // Added for X-axis rotation
const rotationLimit = Math.PI / 2; // 90 degrees in radians

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
  // Panels should be visible by default, so no 'hidden' class should be applied initially
  // The panelManagerInstance.initializePanelManager() will ensure this.
  panelManagerInstance.initializePanelManager();

  initializePromptManager();
  initializeVersionManager();
  initChatUI(); // Initialize Chat UI
  initializeGestureAreaVisualization();
  initializeChatDisplay();

  // 3. Инициализируем 3D сцену (зависят от state, UI) -> Handled by initCore
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
  initializeHammerGestures(); // Added call
  
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

  // Hologram rotation logic
  const gridContainer = document.getElementById('grid-container');
  if (gridContainer) {
    gridContainer.addEventListener('mousedown', onPointerDown);
    gridContainer.addEventListener('mouseup', onPointerUp);
    gridContainer.addEventListener('mousemove', onPointerMove);
    gridContainer.addEventListener('mouseleave', onPointerUp); // Stop rotation if mouse leaves the area

    gridContainer.addEventListener('touchstart', onPointerDown, { passive: false });
    gridContainer.addEventListener('touchend', onPointerUp);
    gridContainer.addEventListener('touchmove', onPointerMove, { passive: false });
  }
});

function onPointerDown(event) {
  isDragging = true;
  startPointerX = (event.touches ? event.touches[0].clientX : event.clientX);
  startPointerY = (event.touches ? event.touches[0].clientY : event.clientY); // Capture Y position

  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    startRotationY = state.hologramRendererInstance.getHologramPivot().rotation.y;
    startRotationX = state.hologramRendererInstance.getHologramPivot().rotation.x;
    console.log('[main.js] onPointerDown: Initial rotation Y:', startRotationY, 'X:', startRotationX);
  }
  // Prevent default to avoid scrolling on touch devices during drag
  if (event.cancelable) event.preventDefault();
}

function onPointerUp() {
  isDragging = false;
  // Animate back to original position (0 radians for both X and Y)
  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    console.log('[main.js] onPointerUp: Attempting to tween hologram back to 0,0');
    new window.TWEEN.Tween(state.hologramRendererInstance.getHologramPivot().rotation)
      .to({ y: 0, x: 0 }, 1000) // Animate to 0 radians for both X and Y over 1000ms
      .easing(window.TWEEN.Easing.Quartic.InOut) // Smooth snap-back effect
      .start();
  }
}

function onPointerMove(event) {
  if (!isDragging) return;

  const currentPointerX = (event.touches ? event.touches[0].clientX : event.clientX);
  const currentPointerY = (event.touches ? event.touches[0].clientY : event.clientY); // Get current Y position

  const deltaX = currentPointerX - startPointerX;
  const deltaY = currentPointerY - startPointerY;

  // Adjust sensitivity for desired rotation speed for both axes
  const sensitivity = 0.005; 
  // Removed negation for rotationAmountY and rotationAmountX to fix inversion
  const rotationAmountY = deltaX * sensitivity; // Rotation around Y-axis (horizontal movement)
  const rotationAmountX = deltaY * sensitivity; // Rotation around X-axis (vertical movement)

  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    let newRotationY = startRotationY + rotationAmountY;
    let newRotationX = startRotationX + rotationAmountX;

    // Clamp rotation to -90 to +90 degrees for both axes
    newRotationY = Math.max(-rotationLimit, Math.min(rotationLimit, newRotationY));
    newRotationX = Math.max(-rotationLimit, Math.min(rotationLimit, newRotationX));
    
    state.hologramRendererInstance.getHologramPivot().rotation.y = newRotationY;
    state.hologramRendererInstance.getHologramPivot().rotation.x = newRotationX;
    // console.log('[main.js] onPointerMove: Current rotation Y:', newRotationY, 'X:', newRotationX);
  }
  // Prevent default to avoid scrolling on touch devices during drag
  if (event.cancelable) event.preventDefault();
}
