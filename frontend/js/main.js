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
} from './core/firebaseInit.js';

console.log('Firebase services imported in main.js:', { firebaseApp, firebaseAuth, firebaseStorage, firebaseFirestore });

import { setAuthDOMElements, initAuthObserver, handleTokenForBackend } from './core/auth.js';
import { initializeConsentManager } from './core/consentManager.js';

// Импорт ядра
import { initCore, state } from './core/init.js';
import { initializeMultimedia } from './core/mediaInitializer.js';
// import { setupEventListeners } from './core/events.js'; // REMOVED - Handled by platform-specific input managers
// import { setupDOMEventHandlers } from './core/domEventHandlers.js'; // REMOVED - Handled by platform-specific input managers
// import { setupFirstInteractionListener } from './core/mediaInitializer.js'; // REMOVED - Handled by MobileInput

// Импорт UI модулей
import { initializeMainUI } from './ui/uiManager.js';
import { initChatUI } from './core/ui/chatUI.js';
// import PanelManager from './ui/panelManager.js'; // REMOVED - Handled by layout managers
import { updateHologramLayout } from './ui/layoutManager.js';
import { initializePromptManager } from './ui/promptManager.js';
import { initializeVersionManager } from './ui/versionManager.js';
import { initializeGestureAreaVisualization } from './ui/gestureAreaVisualization.js';
// import { initializeGestureArea } from './ui/gestureAreaManager.js'; // REMOVED - Handled by MobileLayout
import { initializeChatDisplay } from './panels/chatMessages.js';
// Импорт аудио модулей
import { initializeSpeechInput } from './audio/speechInput.js';
// import { initializeAudioPlayerControls } from './audio/audioFilePlayer.js'; // REMOVED
import { initAudioVisualization } from './audio/audioVisualizer.js';

// Импорт XR модулей
import { initializeXRMode } from './xr/cameraManager.js';

// Импорт 3D модулей
import { animate } from './3d/rendering.js';

// Импорт мультимодальных модулей
import { initializeMediaPipeHands } from './multimodal/handsTracking.js';
// Импорт AI модулей
import { setupChat } from './ai/chat.js';
import { initializeTria } from './ai/tria.js';

// Импорт обработчиков событий (generic ones that remain)
import { initializeResizeHandler } from './core/resizeHandler.js';
import { initializeHammerGestures } from './core/gestures.js';
import { initializePwaInstall } from './core/pwaInstall.js';

// Platform detection
import { detectPlatform } from './core/platformDetector.js';


// Variables for hologram rotation (remains as it's specific to main.js interaction logic for now)
let isDragging = false;
let startPointerX = 0;
let startPointerY = 0;
let startRotationY = 0;
let startRotationX = 0;
const rotationLimit = Math.PI / 2;

// Function to setup Start Session Button Listener
function setupStartButtonListener() {
  const startSessionModal = document.getElementById('start-session-modal');
  const startSessionButton = document.getElementById('start-session-button');
  // const consentModal = document.getElementById('consent-modal'); // Consent modal logic is handled by consentManager

  if (startSessionButton && startSessionModal) {
      startSessionButton.addEventListener('click', async () => {
        console.log("START button clicked. Initializing multimedia...");

        // Hide the modal
        startSessionModal.style.display = 'none';

        // Initialize media (camera/mic, AudioContext)
        await initializeMultimedia();

        // Consent modal display is typically handled by initializeConsentManager or after its check.
        // If needed here, ensure it's shown *after* multimedia initialization if that's the flow.
        // For now, assuming consentManager handles its own display logic at the right time.

    }, { once: true }); // Ensure the handler runs only once
  } else {
      console.error('Could not find required elements for session start: start-session-modal or start-session-button.');
      // If consentModal were critical here, add it to the error message.
  }
}


// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');

  // 0. Initialize Consent Manager (Handles its own UI if needed)
  await initializeConsentManager();
  console.log('User consent check passed/handled.');

  // 1. Core Initialization (includes scene, renderer, camera, etc.)
  await initCore();

  // 2. Initialize Main UI (finds and stores all UI elements in state.uiElements)
  initializeMainUI();

  // 3. Setup Start Button Listener (needs UI elements from initializeMainUI to be available)
  setupStartButtonListener();

  // Subsequent initializations that depend on Core and UI elements
  setAuthDOMElements('signInButton', 'signOutButton', 'userStatus');
  initAuthObserver(handleTokenForBackend);

  initializePromptManager();
  initializeVersionManager();
  initChatUI();
  initializeGestureAreaVisualization(); // Visualization, not manager
  initializeChatDisplay();

  initializeMediaPipeHands();
  // initializeAudioPlayerControls(); // REMOVED
  initializeSpeechInput();
  try {
    if (state.audioAnalyzerLeftInstance && state.hologramRendererInstance) {
      initAudioVisualization(state.audioAnalyzerLeftInstance, state.hologramRendererInstance);
    } else {
      console.warn("Audio visualizer could not be fully initialized: missing analyzer or renderer instances.");
    }
  } catch (error) {
    console.error('Ошибка инициализации аудио:', error);
  }

  initializeTria();
  setupChat();
  initializeXRMode();

  // Generic handlers
  initializeResizeHandler();
  initializeHammerGestures();
  initializePwaInstall();

  // Hologram rotation logic (event listeners for grid-container)
  const gridContainer = document.getElementById('grid-container');
  if (gridContainer) {
    gridContainer.addEventListener('mousedown', onPointerDown);
    gridContainer.addEventListener('mouseup', onPointerUp);
    gridContainer.addEventListener('mousemove', onPointerMove);
    gridContainer.addEventListener('mouseleave', onPointerUp);

    gridContainer.addEventListener('touchstart', onPointerDown, { passive: false });
    gridContainer.addEventListener('touchend', onPointerUp);
    gridContainer.addEventListener('touchmove', onPointerMove, { passive: false });
  }


  // 4. Platform Detection and Dynamic Loading/Initialization of Layout & Input Managers
  const platform = detectPlatform();
  let layoutManager, inputManager;

  try {
      switch (platform) {
          case 'mobile':
              const { MobileLayout } = await import('./platforms/mobile/mobileLayout.js');
              const { MobileInput } = await import('./platforms/mobile/mobileInput.js');
              layoutManager = new MobileLayout(state.uiElements); // Pass uiElements
              inputManager = new MobileInput(); // MobileInput might need state or uiElements later
              break;
          case 'xr':
              console.log('XR platform detected, attempting to load XRLayout/XRInput.');
              const { XrLayout } = await import('./platforms/xr/xrLayout.js');
              const { XrInput } = await import('./platforms/xr/xrInput.js');
              layoutManager = new XrLayout(state.uiElements); // Pass uiElements
              inputManager = new XrInput();
              break;
          default: // 'desktop'
              const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
              const { DesktopInput } = await import('./platforms/desktop/desktopInput.js');
              layoutManager = new DesktopLayout(state.uiElements); // Pass uiElements
              inputManager = new DesktopInput();
              break;
      }
  } catch (e) {
      console.error("Error loading platform-specific modules:", e);
      // Fallback to desktop if dynamic import fails
      if (platform !== 'desktop') {
          console.warn(`Falling back to DesktopLayout/DesktopInput due to error with ${platform} modules.`);
          const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
          const { DesktopInput } = await import('./platforms/desktop/DesktopInput.js'); // Ensure correct path if different
          layoutManager = new DesktopLayout(state.uiElements);
          inputManager = new DesktopInput();
      } else {
          throw e; // Re-throw if desktop itself failed.
      }
  }

  if (layoutManager && typeof layoutManager.initialize === 'function') {
      layoutManager.initialize(); // This will set initial panel visibility etc.
  } else {
      console.warn('LayoutManager not initialized or initialize method not found.');
  }

  if (inputManager && typeof inputManager.initialize === 'function') {
      inputManager.initialize();
  } else {
      console.warn('InputManager not initialized or initialize method not found.');
  }
  console.log(`Platform-specific managers for "${platform}" initialized.`);

  // Fade-in elements after layout manager has initialized panels
  const elementsToFadeIn = [
    '.panel.left-panel',
    '.panel.right-panel',
    '.main-area',
    '#togglePanelsButton'
  ];

  setTimeout(() => {
    elementsToFadeIn.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.remove('u-initially-hidden');
        element.classList.add('u-fade-in-on-load');
      } else {
        console.warn(`Element with selector "${selector}" not found for fade-in animation.`);
      }
    });
  }, 50); // Reduced delay, as critical layout should be done by layoutManager.initialize()

  // Initial call to updateHologramLayout after all setup, especially after layoutManager might have changed panel states.
  if (typeof updateHologramLayout === 'function') {
    console.log('[main.js] Performing initial call to updateHologramLayout after DOMContentLoaded and platform managers.');
    updateHologramLayout();
  } else {
    console.error('[main.js] updateHologramLayout function not available for initial call.');
  }

  console.log('Инициализация завершена!');

  // 5. Start Animation Loop
  animate();
});

// Hologram rotation functions (onPointerDown, onPointerUp, onPointerMove) remain unchanged
function onPointerDown(event) {
  isDragging = true;
  startPointerX = (event.touches ? event.touches[0].clientX : event.clientX);
  startPointerY = (event.touches ? event.touches[0].clientY : event.clientY);

  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    startRotationY = state.hologramRendererInstance.getHologramPivot().rotation.y;
    startRotationX = state.hologramRendererInstance.getHologramPivot().rotation.x;
    console.log('[main.js] onPointerDown: Initial rotation Y:', startRotationY, 'X:', startRotationX);
  }
  if (event.cancelable) event.preventDefault();
}

function onPointerUp() {
  isDragging = false;
  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    console.log('[main.js] onPointerUp: Attempting to tween hologram back to 0,0');
    new window.TWEEN.Tween(state.hologramRendererInstance.getHologramPivot().rotation)
      .to({ y: 0, x: 0 }, 1000)
      .easing(window.TWEEN.Easing.Quartic.InOut)
      .start();
  }
}

function onPointerMove(event) {
  if (!isDragging) return;

  const currentPointerX = (event.touches ? event.touches[0].clientX : event.clientX);
  const currentPointerY = (event.touches ? event.touches[0].clientY : event.clientY);

  const deltaX = currentPointerX - startPointerX;
  const deltaY = currentPointerY - startPointerY;

  const sensitivity = 0.005; 
  const rotationAmountY = deltaX * sensitivity;
  const rotationAmountX = deltaY * sensitivity;

  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    let newRotationY = startRotationY + rotationAmountY;
    let newRotationX = Math.max(-rotationLimit, Math.min(rotationLimit, newRotationX));
    
    state.hologramRendererInstance.getHologramPivot().rotation.y = newRotationY;
    state.hologramRendererInstance.getHologramPivot().rotation.x = newRotationX;
  }
  if (event.cancelable) event.preventDefault();
}
