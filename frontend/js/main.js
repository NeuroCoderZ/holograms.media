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
import { initializeAudioPlayerControls } from './audio/audioFilePlayer.js';
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

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Инициализация приложения...');

  await initializeConsentManager();
  console.log('User consent check passed/handled.');

  // Start Session Modal Logic
  const startSessionModal = document.getElementById('start-session-modal');
  const startSessionButton = document.getElementById('start-session-button');
  const consentModal = document.getElementById('consent-modal'); // Assuming this is the ID of the Data Storage Consent modal

  if (startSessionButton && startSessionModal && consentModal) {
      startSessionButton.addEventListener('click', async () => {
          try {
              await initializeMultimedia(); // Call the function from mediaInitializer.js

              // Resume AudioContext if it's suspended
              if (state.audioContext && state.audioContext.state === 'suspended') {
                await state.audioContext.resume();
                console.log('AudioContext resumed successfully.');
              }

              startSessionModal.style.display = 'none'; // Hide the start session modal

              // Ensure consentManager.js's logic for showing consent modal is used
              // For example, if consentManager.showConsentModalIfNeeded() exists:
              // showConsentModalIfNeeded();
              // OR directly show it if that's the new flow:
              consentModal.style.display = 'flex'; // Show the consent modal
              console.log('Start session button clicked, multimedia initialized, consent modal shown.');
          } catch (error) {
              console.error("Error during session start sequence:", error);
              // Optionally, provide user feedback here
          }
      });
  } else {
      console.error('Could not find all required elements for session start: start-session-modal, start-session-button, or consent-modal.');
  }

  await initCore();
  initializeMainUI();
  // setupFirstInteractionListener(); // REMOVED - Handled by MobileInput

  setAuthDOMElements('signInButton', 'signOutButton', 'userStatus');
  initAuthObserver(handleTokenForBackend);

  // const panelManagerInstance = new PanelManager(); // REMOVED
  // panelManagerInstance.initializePanelManager(); // REMOVED

  initializePromptManager();
  initializeVersionManager();
  initChatUI();
  initializeGestureAreaVisualization(); // This is visualization, not manager
  // initializeGestureArea(); // REMOVED - Handled by MobileLayout
  initializeChatDisplay();

  initializeMediaPipeHands();
  initializeAudioPlayerControls();
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

  // Platform-specific setup
  const platform = detectPlatform();
  console.log(`Detected platform: ${platform}`);
  let layoutManager, inputManager;

  try {
    switch (platform) {
        case 'mobile':
            const { MobileLayout } = await import('./platforms/mobile/mobileLayout.js');
            const { MobileInput } = await import('./platforms/mobile/mobileInput.js');
            layoutManager = new MobileLayout();
            inputManager = new MobileInput();
            break;
        case 'xr':
            console.log('XR platform detected, attempting to load XRLayout/XRInput.');
            // Assuming placeholder files exist or will be created
            const { XrLayout } = await import('./platforms/xr/xrLayout.js');
            const { XrInput } = await import('./platforms/xr/xrInput.js');
            layoutManager = new XrLayout();
            inputManager = new XrInput();
            break;
        default: // 'desktop'
            const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
            const { DesktopInput } = await import('./platforms/desktop/desktopInput.js');
            layoutManager = new DesktopLayout();
            inputManager = new DesktopInput();
            break;
    }
  } catch (e) {
      console.error("Error loading platform-specific modules:", e);
      // Fallback to desktop if dynamic import fails for mobile/xr to ensure app still tries to load
      if (platform !== 'desktop') {
        console.warn(`Falling back to DesktopLayout/DesktopInput due to error with ${platform} modules.`);
        const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
        const { DesktopInput } = await import('./platforms/desktop/desktopInput.js');
        layoutManager = new DesktopLayout();
        inputManager = new DesktopInput();
      } else {
        // If desktop itself failed, then there's a bigger issue.
         throw e; // Re-throw if desktop fails.
      }
  }


  if (layoutManager && typeof layoutManager.initialize === 'function') {
      layoutManager.initialize();
  } else {
      console.warn('LayoutManager not initialized or initialize method not found.');
  }

  if (inputManager && typeof inputManager.initialize === 'function') {
      inputManager.initialize();
  } else {
      console.warn('InputManager not initialized or initialize method not found.');
  }

  // setupDOMEventHandlers(); // REMOVED - Handled by platform-specific input managers
  // setupEventListeners(); // REMOVED - Handled by platform-specific input managers

  // Generic handlers that are still relevant
  initializeResizeHandler();
  initializeHammerGestures();
  initializePwaInstall();

  animate();

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
  }, 100);

  console.log('Инициализация завершена!');

  // Run frontend diagnostics (if needed, keep it)
  // setTimeout(() => {
  //   runFrontendDiagnostics();
  // }, 1000);


  // Hologram rotation logic
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
    let newRotationX = startRotationX + rotationAmountX;

    newRotationY = Math.max(-rotationLimit, Math.min(rotationLimit, newRotationY));
    newRotationX = Math.max(-rotationLimit, Math.min(rotationLimit, newRotationX));
    
    state.hologramRendererInstance.getHologramPivot().rotation.y = newRotationY;
    state.hologramRendererInstance.getHologramPivot().rotation.x = newRotationX;
  }
  if (event.cancelable) event.preventDefault();
}
