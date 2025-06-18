// Frontend/js/main.js - Основная точка входа для приложения

// --- BEGIN TTA CORE SYNTHESIS IMPORTS ---
import eventBus from './core/eventBus.js'; // ИСПРАВЛЕННЫЙ ИМПОРТ

// Block 1 Managers
import RightPanelManager from './managers/RightPanelManager.js';
import VersionTimelinePanel from './ui/VersionTimelinePanel.js';

// Block 2 Managers
import HologramManager from './managers/HologramManager.js';
import InteractionManager from './managers/InteractionManager.js';

// Block 3 Managers (+ GestureUIManager from Block 2)
import GestureUIManager from './ui/GestureUIManager.js'; // Handles #gesture-area UI, red line, dots
import GestureRecordingManager from './managers/GestureRecordingManager.js';

// Block 4 Managers
import MyGesturesPanel from './ui/MyGesturesPanel.js';
import GesturesListDisplay from './ui/GesturesListDisplay.js';
// --- END TTA CORE SYNTHESIS IMPORTS ---

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
import { updateHologramLayout, initializeLayoutManager as initializeCoreLayoutManager } from './ui/layoutManager.js'; // Aliased import
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
import * as THREE from 'three'; // Added for TTA Core Synthesis, ensures THREE is available if new managers use it directly

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

        // Explicitly resume AudioContext if it's suspended, after multimedia initialization
        if (state.audio && state.audio.audioContext && state.audio.audioContext.state === 'suspended') {
          state.audio.audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully after START button click.');
          }).catch(e => {
            console.error('Error resuming AudioContext after START button click:', e);
          });
        }

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
  await initCore(); // Ensures 'state' object is initialized

  // 2. Initialize Main UI (finds and stores all UI elements in state.uiElements)
  // This function will now ensure state.uiElements is populated correctly.
  initializeMainUI(state); // Pass state if uiManager needs it to attach uiElements

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

  initializeMediaPipeHands(); // Original call - review if it needs eventBus
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
              layoutManager = new MobileLayout(state); // Pass global state
              inputManager = new MobileInput(state);   // Pass global state
              break;
          case 'xr':
              console.log('XR platform detected, attempting to load XRLayout/XRInput.');
              const { XrLayout } = await import('./platforms/xr/xrLayout.js');
              const { XrInput } = await import('./platforms/xr/xrInput.js');
              layoutManager = new XrLayout(state); // Pass global state
              inputManager = new XrInput(state);   // Pass global state
              break;
          default: // 'desktop'
              const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
              const { DesktopInput } = await import('./platforms/desktop/desktopInput.js');
              layoutManager = new DesktopLayout(state); // Pass global state
              inputManager = new DesktopInput(state);   // Pass global state
              break;
      }
  } catch (e) {
      console.error("Error loading platform-specific modules:", e);
      // Fallback to desktop if dynamic import fails
      if (platform !== 'desktop') {
          console.warn(`Falling back to DesktopLayout/DesktopInput due to error with ${platform} modules.`);
          const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
          const { DesktopInput } = await import('./platforms/desktop/desktopInput.js'); // Corrected path
          layoutManager = new DesktopLayout(state); // Pass global state
          inputManager = new DesktopInput(state);   // Pass global state
      } else {
          throw e; // Re-throw if desktop itself failed.
      }
  }

  if (layoutManager && typeof layoutManager.initialize === 'function') {
      layoutManager.initialize(); // This will set initial panel visibility etc.
      // Call the core layout manager initialization AFTER platform-specific one
      initializeCoreLayoutManager();
      console.log('[Main.js] Core LayoutManager (for hologram container) initialized.');
  } else {
      console.warn('Platform-specific LayoutManager not initialized or initialize method not found. Core LayoutManager might not behave as expected.');
      // Still attempt to initialize core layout manager if platform one failed but core one exists
      initializeCoreLayoutManager();
      console.log('[Main.js] Core LayoutManager (for hologram container) initialized (platform-specific failed or missing).');
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

  // --- BEGIN TTA CORE SYNTHESIS MANAGER INITIALIZATION ---
  console.log('[TTA Core] Initializing new managers...');

  // Initialize EventBus (GLOBAL INSTANCE)
  // const eventBus = new EventBus(); // <-- УДАЛИТЬ ЭТУ СТРОКУ
  window.eventBus = eventBus; // Make it globally accessible if needed for older modules or debugging

  // AppState (using existing 'state' from './core/init.js')
  // Pass the global 'state' object directly to managers expecting 'appState'.
  // Managers will be adapted to use 'state' directly if they were expecting getState/setState methods not present on the plain 'state' object.
  // const appState = state; // No longer needed, pass state directly.

  // Ensure essential DOM elements for new managers are available from state.uiElements or query them
  // It's assumed that initializeMainUI() has already populated state.uiElements by this point.
  const gestureAreaElement = state.uiElements.gestureArea || document.getElementById('gesture-area');
  // const chatButtonElement = state.uiElements.chatButton; // Should be in state.uiElements
  // const versionTimelineContainerElement = state.uiElements.versionTimelineContainer; // Should be in state.uiElements
  // const chatInterfaceContainerElement = state.uiElements.chatInterfaceContainer; // Should be in state.uiElements
  // const gesturesListContainerElement = state.uiElements.gesturesListContainer; // Should be in state.uiElements


  if (!gestureAreaElement) {
      console.error("[TTA Core] CRITICAL: #gesture-area DOM element not found. Gesture functionalities will fail.");
  }
  // Add similar checks for other critical elements if not covered by individual manager logs

  // Instantiate Managers (order can be important)
  // Block 1 Managers
  const gesturesListDisplay = new GesturesListDisplay(eventBus); // Needs to be created before RightPanelManager if passed as instance
  const rightPanelManager = new RightPanelManager(state, eventBus, gesturesListDisplay); // Pass global state
  const versionTimelinePanel = new VersionTimelinePanel(state, eventBus /*, versionService */); // Pass global state

  // Block 2 & 3 UI Managers
  const gestureUIManager = new GestureUIManager(eventBus, state); // Pass global state

  // Block 2 Core 3D Managers
  // state.threeJs should contain scene, camera, renderer from initCore()
  const hologramManager = new HologramManager(state.threeJs.scene, state.threeJs.camera, eventBus, state); // Pass global state
  const interactionManager = new InteractionManager(state.threeJs.renderer.domElement, hologramManager);

  // Block 3 Recording Manager
  if (gestureAreaElement && gestureUIManager) {
      const gestureRecordingManager = new GestureRecordingManager(state, gestureAreaElement, gestureUIManager, eventBus); // Pass global state
      // Make it globally accessible if other parts of the old system need to interact, e.g. for destroy
      state.gestureRecordingManager = gestureRecordingManager;
  } else {
      console.error("[TTA Core] Cannot initialize GestureRecordingManager due to missing #gesture-area or GestureUIManager.");
  }

  // Block 4 Panel Interaction
  const myGesturesPanel = new MyGesturesPanel(eventBus);
  // Make globally accessible if needed
  state.myGesturesPanel = myGesturesPanel;
  state.rightPanelManager = rightPanelManager;
  state.versionTimelinePanel = versionTimelinePanel;
  state.gestureUIManager = gestureUIManager;
  state.hologramManager = hologramManager;
  state.interactionManager = interactionManager;
  state.gesturesListDisplay = gesturesListDisplay;


  // Initialize HologramManager with actual visuals
  // The existing system uses state.hologramRendererInstance.getHologramPivot() for the main group.
  // The new HologramManager is designed to manage its own pivot for layout and animation.
  // We need to pass the *visual content* of the hologram to the new manager.
  if (hologramManager && state.hologramRendererInstance && state.hologramRendererInstance.getHologramContentGroup) {
      hologramManager.initializeHologram(state.hologramRendererInstance.getHologramContentGroup());
  } else if (hologramManager && state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot && state.hologramRendererInstance.getHologramPivot().children.length > 0) {
      console.warn("[TTA Core] Passing mainSequencerGroup from existing hologramRenderer's pivot to new HologramManager. Review if this is the correct visual group.")
      // This assumes the getHologramPivot() itself is not the one being animated by old logic, but its children are the content.
      // A safer approach might be to create a new group, add existing visual children to it, and pass that.
      // For now, direct pass:
      hologramManager.initializeHologram(state.hologramRendererInstance.getHologramPivot());
  } else if (hologramManager) {
      console.warn("[TTA Core] Could not get main hologram visuals group for HologramManager. Initializing with an empty group.");
      hologramManager.initializeHologram(new THREE.Group()); // Initialize with empty if nothing found
  }

  // Re-evaluate initializeMediaPipeHands - it should emit to the eventBus.
  // If initializeMediaPipeHands is already structured to accept eventBus or use a global one, this is fine.
  // Otherwise, it needs refactoring. Assuming it's adapted.
  // initializeMediaPipeHands(eventBus); // This was called earlier, ensure it uses the new eventBus if called again or refactor its original call.
  console.log('[TTA Core] New managers initialized.');
  // --- END TTA CORE SYNTHESIS MANAGER INITIALIZATION ---

  // New logic for consent checkbox and start button
  const consentCheckbox = document.getElementById('consent-checkbox');
  const startButton = document.getElementById('start-session-button');
  const googleSignInBtn = document.getElementById('login-google-btn'); // Existing Google Sign-In button
  const googleContainer = document.getElementById('google-signin-container'); // New container in the modal

  if (googleSignInBtn && googleContainer) {
    googleContainer.appendChild(googleSignInBtn);
    // Ensure the button is visible if it was hidden by display:none or similar
    googleSignInBtn.style.display = 'block'; // Or 'flex', 'inline-block' depending on desired layout
     // Adjust button styling for the modal if necessary
    googleSignInBtn.classList.add('google-signin-modal-style'); // Example class
  }

  if (consentCheckbox && startButton) {
    consentCheckbox.addEventListener('change', () => {
      if (consentCheckbox.checked) {
        startButton.disabled = false;
        startButton.classList.remove('start-button-disabled');
      } else {
        startButton.disabled = true;
        startButton.classList.add('start-button-disabled');
      }
    });
  }

  console.log('Инициализация завершена!');

  // 5. Start Animation Loop
  animate();
});

// Hologram rotation functions (onPointerDown, onPointerUp, onPointerMove) remain unchanged
// These functions currently use state.hologramRendererInstance.getHologramPivot().
// If the new HologramManager takes over all pivot manipulation, these might conflict or need redirection.
// For now, they will coexist. The new InteractionManager uses HammerJS on renderer.domElement.
// This old logic uses mouse/touch on #grid-container. Potential conflict or redundancy.
function onPointerDown(event) {
  isDragging = true;
  startPointerX = (event.touches ? event.touches[0].clientX : event.clientX);
  startPointerY = (event.touches ? event.touches[0].clientY : event.clientY);

  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    startRotationY = state.hologramRendererInstance.getHologramPivot().rotation.y;
    startRotationX = state.hologramRendererInstance.getHologramPivot().rotation.x;
    console.log('[main.js - old rotation] onPointerDown: Initial rotation Y:', startRotationY, 'X:', startRotationX);
  }
  if (event.cancelable) event.preventDefault();
}

function onPointerUp() {
  isDragging = false;
  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    console.log('[main.js - old rotation] onPointerUp: Attempting to tween hologram back to 0,0');
    if (window.TWEEN) { // Ensure TWEEN is available
        new window.TWEEN.Tween(state.hologramRendererInstance.getHologramPivot().rotation)
        .to({ y: 0, x: 0 }, 1000)
        .easing(window.TWEEN.Easing.Quartic.InOut)
        .start();
    } else {
        console.warn("[main.js - old rotation] TWEEN not found for hologram reset animation.");
        // Fallback to direct set if TWEEN is not available for some reason
        state.hologramRendererInstance.getHologramPivot().rotation.x = 0;
        state.hologramRendererInstance.getHologramPivot().rotation.y = 0;
    }
  }
}

function onPointerMove(event) {
  // Ensure newRotationX and newRotationY are declared, as per subtask.
  let newRotationX, newRotationY;
  if (!isDragging) return;

  const currentPointerX = (event.touches ? event.touches[0].clientX : event.clientX);
  const currentPointerY = (event.touches ? event.touches[0].clientY : event.clientY);

  const deltaX = currentPointerX - startPointerX;
  const deltaY = currentPointerY - startPointerY;

  const sensitivity = 0.005; 
  const rotationAmountY = deltaX * sensitivity;
  const rotationAmountX = deltaY * sensitivity;

  if (state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot()) {
    newRotationY = startRotationY + rotationAmountY; // Removed let
    newRotationX = startRotationX + rotationAmountX; // Removed let
    newRotationX = Math.max(-rotationLimit, Math.min(rotationLimit, newRotationX));
    
    state.hologramRendererInstance.getHologramPivot().rotation.y = newRotationY;
    state.hologramRendererInstance.getHologramPivot().rotation.x = newRotationX;
  }
  if (event.cancelable) event.preventDefault();
}
