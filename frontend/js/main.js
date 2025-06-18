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
import { ConsentManager } from './core/consentManager.js'; // MODIFIED IMPORT

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

        console.log('Proceeding with core application initialization after user start...');

        // 1. Core Initialization (includes scene, renderer, camera, etc.)
        await initCore(); // Ensures 'state' object is initialized

        // 2. Initialize Main UI (finds and stores all UI elements in state.uiElements)
        initializeMainUI(state); // Pass state if uiManager needs it to attach uiElements

        // Initialize MediaPipe Hands (safer here if it interacts with UI/3D)
        initializeMediaPipeHands();

        // Initialize Audio Visualization (depends on initCore)
        try {
          if (state.audioAnalyzerLeftInstance && state.hologramRendererInstance) {
            initAudioVisualization(state.audioAnalyzerLeftInstance, state.hologramRendererInstance);
          } else {
            console.warn("Audio visualizer could not be fully initialized: missing analyzer or renderer instances.");
          }
        } catch (error) {
          console.error('Ошибка инициализации аудио визуализации:', error);
        }

        // Initialize XR Mode (depends on initCore)
        initializeXRMode();

        // Hologram rotation logic (event listeners for grid-container) - depends on initCore
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
        }, 50);

        // Initial call to updateHologramLayout after all setup
        if (typeof updateHologramLayout === 'function') {
          console.log('[main.js] Performing initial call to updateHologramLayout after platform managers.');
          updateHologramLayout();
        } else {
          console.error('[main.js] updateHologramLayout function not available for initial call.');
        }

        // --- BEGIN TTA CORE SYNTHESIS MANAGER INITIALIZATION ---
        console.log('[TTA Core] Initializing new managers...');
        window.eventBus = eventBus;

        const gestureAreaElement = state.uiElements.gestureArea || document.getElementById('gesture-area');
        if (!gestureAreaElement) {
            console.error("[TTA Core] CRITICAL: #gesture-area DOM element not found. Gesture functionalities will fail.");
        }

        const gesturesListDisplay = new GesturesListDisplay(eventBus);
        const rightPanelManager = new RightPanelManager(state, eventBus, gesturesListDisplay);
        const versionTimelinePanel = new VersionTimelinePanel(state, eventBus);
        const gestureUIManager = new GestureUIManager(eventBus, state);
        const hologramManager = new HologramManager(state.threeJs.scene, state.threeJs.camera, eventBus, state);
        const interactionManager = new InteractionManager(state.threeJs.renderer.domElement, hologramManager);

        if (gestureAreaElement && gestureUIManager) {
            const gestureRecordingManager = new GestureRecordingManager(state, gestureAreaElement, gestureUIManager, eventBus);
            state.gestureRecordingManager = gestureRecordingManager;
        } else {
            console.error("[TTA Core] Cannot initialize GestureRecordingManager due to missing #gesture-area or GestureUIManager.");
        }

        const myGesturesPanel = new MyGesturesPanel(eventBus);
        state.myGesturesPanel = myGesturesPanel;
        state.rightPanelManager = rightPanelManager;
        state.versionTimelinePanel = versionTimelinePanel;
        state.gestureUIManager = gestureUIManager;
        state.hologramManager = hologramManager;
        state.interactionManager = interactionManager;
        state.gesturesListDisplay = gesturesListDisplay;

        if (hologramManager && state.hologramRendererInstance && state.hologramRendererInstance.getHologramContentGroup) {
            hologramManager.initializeHologram(state.hologramRendererInstance.getHologramContentGroup());
        } else if (hologramManager && state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot && state.hologramRendererInstance.getHologramPivot().children.length > 0) {
            console.warn("[TTA Core] Passing mainSequencerGroup from existing hologramRenderer's pivot to new HologramManager. Review if this is the correct visual group.")
            hologramManager.initializeHologram(state.hologramRendererInstance.getHologramPivot());
        } else if (hologramManager) {
            console.warn("[TTA Core] Could not get main hologram visuals group for HologramManager. Initializing with an empty group.");
            hologramManager.initializeHologram(new THREE.Group());
        }
        console.log('[TTA Core] New managers initialized.');
        // --- END TTA CORE SYNTHESIS MANAGER INITIALIZATION ---

        console.log('Core application initialization complete. Starting animation loop...');
        // 5. Start Animation Loop
        animate();

        // Ensure UI elements that might have been hidden are now visible
        // For example, the main application area or specific panels
        const mainAppArea = document.querySelector('.main-application-area'); // Example selector
        if (mainAppArea) {
          mainAppArea.style.visibility = 'visible';
          mainAppArea.style.opacity = '1';
        }
        // Add other elements as needed

    }, { once: true }); // Ensure the handler runs only once
  } else {
      console.error('Could not find required elements for session start: start-session-modal or start-session-button.');
      // If consentModal were critical here, add it to the error message.
  }
}


window.addEventListener('DOMContentLoaded', async () => {
    console.log("Инициализация приложения (Pre-Start)...");

    // --- ЭТАП 1: ИНИЦИАЛИЗАЦИЯ ТОЛЬКО ТОГО, ЧТО НЕ ТРЕБУЕТ DOM ---
    initCore(); // Создает state, AudioContext и т.д.
    const consentManager = new ConsentManager(state); // Requires ConsentManager import
    await consentManager.initialize();

    // --- ЭТАП 2: ПОИСК ВСЕХ DOM-ЭЛЕМЕНТОВ ---
    initializeMainUI(state); // Находит все элементы и кладет их в state.uiElements

    // --- ЭТАП 3: НАСТРОЙКА СТАРТОВОЙ КНОПКИ ---
    const startButton = state.uiElements.buttons.startSessionButton;
    const startModal = state.uiElements.modals.startSessionModal;

    if (startButton && startModal) {
        const consentCheckbox = document.getElementById('consent-checkbox');
        if (consentCheckbox) {
            consentCheckbox.addEventListener('change', () => {
                startButton.disabled = !consentCheckbox.checked;
            });
            startButton.disabled = !consentCheckbox.checked; // Initial state
        } else {
            console.warn("'consent-checkbox' not found. Start button state might not be managed by checkbox.");
        }

        startButton.addEventListener('click', async () => {
            startModal.style.display = 'none';

            await initializeMultimedia(state);

            const platform = detectPlatform();
            let layoutManager, inputManager;
            try {
                switch (platform) {
                    case 'mobile':
                        const { MobileLayout } = await import('./platforms/mobile/mobileLayout.js');
                        const { MobileInput } = await import('./platforms/mobile/mobileInput.js');
                        layoutManager = new MobileLayout(state);
                        inputManager = new MobileInput(state);
                        break;
                    case 'xr':
                        const { XrLayout } = await import('./platforms/xr/xrLayout.js');
                        const { XrInput } = await import('./platforms/xr/xrInput.js');
                        layoutManager = new XrLayout(state);
                        inputManager = new XrInput(state);
                        break;
                    default: // 'desktop'
                        const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
                        const { DesktopInput } = await import('./platforms/desktop/desktopInput.js');
                        layoutManager = new DesktopLayout(state);
                        inputManager = new DesktopInput(state);
                        break;
                }
            } catch (e) {
                console.error("Error loading platform-specific modules:", e);
                if (platform !== 'desktop') {
                    console.warn(`Falling back to DesktopLayout/DesktopInput due to error with ${platform} modules.`);
                    const { DesktopLayout } = await import('./platforms/desktop/desktopLayout.js');
                    const { DesktopInput } = await import('./platforms/desktop/desktopInput.js');
                    layoutManager = new DesktopLayout(state);
                    inputManager = new DesktopInput(state);
                } else {
                    throw e;
                }
            }

            if (layoutManager) layoutManager.initialize();
            if (inputManager) inputManager.initialize();

            console.log('[TTA Core] Initializing new managers (reconstructed for new structure)...');

            const gestureAreaElement = state.uiElements.gestureArea || document.getElementById('gesture-area');
            if (!gestureAreaElement) {
                console.error("[TTA Core] CRITICAL: #gesture-area DOM element not found.");
            }

            const gesturesListDisplay = new GesturesListDisplay(eventBus);
            const rightPanelManager = new RightPanelManager(state, eventBus, gesturesListDisplay);
            const versionTimelinePanel = new VersionTimelinePanel(state, eventBus);
            const gestureUIManager = new GestureUIManager(eventBus, state);
            const hologramManager = new HologramManager(state.threeJs.scene, state.threeJs.camera, eventBus, state);
            const interactionManager = new InteractionManager(state.threeJs.renderer.domElement, hologramManager);

            if (gestureAreaElement && gestureUIManager) {
                const gestureRecordingManager = new GestureRecordingManager(state, gestureAreaElement, gestureUIManager, eventBus);
                state.gestureRecordingManager = gestureRecordingManager;
            } else {
                console.error("[TTA Core] Cannot initialize GestureRecordingManager.");
            }

            const myGesturesPanel = new MyGesturesPanel(eventBus);
            state.myGesturesPanel = myGesturesPanel;
            state.rightPanelManager = rightPanelManager;
            state.versionTimelinePanel = versionTimelinePanel;
            state.gestureUIManager = gestureUIManager;
            state.hologramManager = hologramManager;
            state.interactionManager = interactionManager;
            state.gesturesListDisplay = gesturesListDisplay;

            if (hologramManager && state.hologramRendererInstance && state.hologramRendererInstance.getHologramContentGroup) {
                hologramManager.initializeHologram(state.hologramRendererInstance.getHologramContentGroup());
            } else if (hologramManager && state.hologramRendererInstance && state.hologramRendererInstance.getHologramPivot && state.hologramRendererInstance.getHologramPivot().children.length > 0) {
                console.warn("[TTA Core] Passing mainSequencerGroup from existing hologramRenderer's pivot to new HologramManager.");
                hologramManager.initializeHologram(state.hologramRendererInstance.getHologramPivot());
            } else if (hologramManager) {
                console.warn("[TTA Core] Could not get main hologram visuals group for HologramManager. Initializing with an empty group.");
                hologramManager.initializeHologram(new THREE.Group());
            }
            console.log('[TTA Core] New managers initialized.');

            setupChat(state);
            animate();

        }, { once: true });
    } else {
        console.error("Start button or start modal not found. Main application flow cannot begin.");
    }

    initializePwaInstall();
    initAuthObserver(handleTokenForBackend);
});

// Hologram rotation functions (onPointerDown, onPointerUp, onPointerMove) remain unchanged
// These are now called from within the startButton click listener context if gridContainer is found there.
// This means they will only be active after initCore() and other setups.
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
