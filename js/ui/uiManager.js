// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
// import { state } from '../core/init.js'; // Removed direct import, appState will be used

// import { uploadChunk } from '../services/apiService.js'; // Old direct backend upload, now replaced by R2 presigned
import { initializePwaInstall } from '../core/pwaInstall.js';
// panelManager is used to switch visible content panels in the right sidebar.
// import PanelManager from './panelManager.js'; // PanelManager is now globally managed via state.panelManager
import { toggleFullscreen, initFullscreenListeners } from '../utils/fullscreen.js'; // Import for fullscreen
import { toggleTriaLearningMode } from '../ai/tria.js'; // Import for Tria button
import { initializeRightPanel } from '../panels/rightPanelManager.js'; // Import for right panel logic
import { hologramScanner } from '../multimodal/hologramScanner.js'; // Import for Scanner button
import { gestureSynthesizer } from '../audio/GestureSynthesizer.js'; // Import for Gesture Synth

/**
 * uiElements is a central object holding references to all significant DOM elements
 * managed by uiManager.js. This approach helps in organizing and accessing UI components
 * throughout the application without repeated document queries.
 */
export const uiElements = {
  // --- Buttons in the left sidebar ---
  buttons: {
    fileButton: null,         // Button to trigger file upload (e.g., for audio/chunks)
    playButton: null,         // Audio playback control
    pauseButton: null,
    stopButton: null,
    micButton: null,          // Toggle microphone input for visualization
    fullscreenButton: null,   // Toggle browser fullscreen mode
    xrButton: null,           // Enter/Exit WebXR mode (VR/AR)
    gestureRecordButton: null, // Button to open 'My Gestures' panel or start gesture recording
    synthButton: null,        // Performance mode: Gesture Audio Synthesis
    hologramListButton: null,  // Button to open 'My Holograms' panel
    scanButton: null,         // Placeholder for scanning functionality
    bluetoothButton: null,    // Placeholder for Bluetooth connections (e.g., EEG devices)
    telegramLinkButton: null,  // Link to Telegram chat
    githubButton: null,       // Link to GitHub repository
    triaButton: null,         // Placeholder for activating Tria AI training/modes
    promptModeButton: null,   // Button to toggle between Prompt and Chat modes
    installPwaButton: null,   // Button to prompt PWA installation
  },

  // --- Elements in the right sidebar (main content areas) ---
  versionTimeline: null,    // Container for version timeline content
  chatHistory: null,        // Container for chat messages with Tria

  // --- Main application layout containers ---
  gridContainer: null,      // Main 3D visualization area
  gestureArea: null,        // Area for gesture visualization/interaction
  containers: {
    chatMessages: null       // Specific div within chatHistory for messages
  },

  // --- Modal dialog windows ---
  modals: {
    gestureModal: null,       // Modal for gesture recording
    promptModal: null,        // Modal for complex prompt input
    fileEditorModal: null,    // Modal for integrated file editor
  },

  // --- Input fields ---
  inputs: {
    fileInput: null,          // Generic file input (possibly hidden, triggered by fileButton)
    audioFileInput: null,     // Specific input for audio files (might be redundant with chunkUploadInput)
    chunkUploadInput: null,   // Universal hidden file input for chunk uploads
    topPromptInput: null,     // Main prompt input field (e.g., for general commands)
    chatInput: null,          // Input field for Tria chat messages
    promptText: null,         // Textarea within the prompt modal
    modelSelect: null,        // Dropdown for selecting LLM models
  },

  // --- Action buttons (often within input forms or modals) ---
  // Listeners for these are typically set up in other modules (e.g., chat.js, fileEditor.js).
  actions: {
    submitTopPrompt: null,      // Submit button for the main prompt input
    submitChatMessage: null,    // Submit button for chat messages
    submitPrompt: null,         // Submit button within the prompt modal
    startRecordingButton: null, // Start gesture recording
    stopRecordingButton: null,  // Stop gesture recording
    saveFileButton: null,       // Save button in the file editor modal
    closeGestureModal: null,    // Close button for gesture modal
    closePromptModal: null,     // Close button for prompt modal
    closeFileEditorModal: null, // Close button for file editor modal
  },

  // --- Panel elements and toggles ---
  leftPanel: null,          // Reference to the left sidebar DOM element - Managed by PanelManager
  rightPanel: null,         // Reference to the right sidebar DOM element - Managed by PanelManager
  togglePanelsButton: null, // Button to hide/show both side panels - Managed by PanelManager
};


/**
 * Adds debug CSS classes to specific UI elements. 
 * This is useful during development for visually identifying and inspecting elements.
 */
function addDebugClasses() {
  const elements = {
    panel: document.querySelector('.panel.left-panel'),
    label: document.querySelector('.version-label')
  };

  Object.entries(elements).forEach(([key, element]) => {
    if (element) {
      element.classList.add(`debug-${key}`);
    }
  });
}

/**
 * Logs the current bounding client rectangles (dimensions and positions) of key UI layout elements.
 * Useful for debugging layout issues.
 */
function logLayoutState() {
  console.log('Текущее состояние макета UI:');
  console.log('Левая панель:', uiElements.leftPanel ? uiElements.leftPanel.getBoundingClientRect() : 'не найдена');
  console.log('Правая панель:', uiElements.rightPanel ? uiElements.rightPanel.getBoundingClientRect() : 'не найдена');
  console.log('Контейнер сетки:', uiElements.gridContainer ? uiElements.gridContainer.getBoundingClientRect() : 'не найдена');
  console.log('Область жестов:', uiElements.gestureArea ? uiElements.gestureArea.getBoundingClientRect() : 'не найдена');
  console.log('Контейнер чата:', uiElements.containers.chatMessages ? uiElements.containers.chatMessages.getBoundingClientRect() : 'не найдена');
}

/**
 * The main initialization function for the application's user interface.
 * It finds all necessary DOM elements by their IDs, sets up initial states, 
 * and assigns primary event listeners.
 */
export function initializeMainUI(appState) { // Accept state passed from main.js
  console.log('Инициализация основного UI...');

  // --- Get references to core layout panel elements by ID ---
  // These are critical for layout managers and need to be robustly found.
  uiElements.leftPanel = document.getElementById('left-panel');
  uiElements.rightPanel = document.getElementById('right-panel');
  uiElements.togglePanelsButton = document.getElementById('togglePanelsButton');

  if (!uiElements.leftPanel) {
    console.error('[UIManager CRITICAL] #left-panel not found!');
  }
  if (!uiElements.rightPanel) {
    console.error('[UIManager CRITICAL] #right-panel not found!');
  }

  // --- Get references to all interactive UI elements by ID ---
  // Buttons in the left panel
  uiElements.buttons.fileButton = document.getElementById('loadAudioButton');
  uiElements.buttons.playButton = document.getElementById('playAudioButton');
  uiElements.buttons.pauseButton = document.getElementById('pauseAudioButton');
  uiElements.buttons.stopButton = document.getElementById('stopAudioButton');
  uiElements.buttons.micButton = document.getElementById('micButton');
  uiElements.buttons.fullscreenButton = document.getElementById('fullscreenButton');
  uiElements.buttons.xrButton = document.getElementById('xrButton');
  uiElements.buttons.gestureRecordButton = document.getElementById('gestureRecordButton');
  uiElements.buttons.synthButton = document.getElementById('synthButton');
  uiElements.buttons.hologramListButton = document.getElementById('hologramListButton');
  uiElements.buttons.scanButton = document.getElementById('scanButton');
  uiElements.buttons.bluetoothButton = document.getElementById('bluetoothButton');
  uiElements.buttons.telegramLinkButton = document.getElementById('telegramLinkButton');
  uiElements.buttons.githubButton = document.getElementById('githubButton');
  uiElements.buttons.triaButton = document.getElementById('triaButton'); // For "Activate Tria Training"
  uiElements.buttons.promptModeButton = document.getElementById('promptModeButton'); // For Toggling Chat Mode / Opening Chat Panel
  uiElements.buttons.installPwaButton = document.getElementById('installPwaButton');
  uiElements.buttons.avatarButton = document.getElementById('avatarButton'); // Added Avatar button

  // Left-panel Google login (legacy sidebar button) — ensure it opens the sign-in modal / triggers GSI prompt
  const leftGoogleBtn = document.getElementById('login-google-btn');
  if (leftGoogleBtn) {
    leftGoogleBtn.addEventListener('click', () => {
      console.log('[UIManager] #login-google-btn clicked — opening sign-in modal / prompting GSI');
      const startSessionModal = document.getElementById('start-session-modal');
      if (startSessionModal) startSessionModal.style.display = 'block';
      if (window.google && window.google.accounts && window.google.accounts.id && typeof window.google.accounts.id.prompt === 'function') {
        try { window.google.accounts.id.prompt(); } catch (err) { console.warn('[UIManager] google.accounts.id.prompt() failed:', err); }
      }
    });
  }

  // Right panel content sections
  uiElements.versionTimeline = document.getElementById('versionTimeline');
  uiElements.chatHistory = document.getElementById('chatHistory');

  // Main layout containers
  uiElements.gridContainer = document.getElementById('grid-container');
  uiElements.gestureArea = document.getElementById('gesture-area');
  uiElements.containers.chatMessages = document.getElementById('chatMessages'); // Specific div for chat messages

  // Modal dialogs
  uiElements.modals.gestureModal = document.getElementById('gestureModal');
  uiElements.modals.promptModal = document.getElementById('promptModal');
  uiElements.modals.fileEditorModal = document.getElementById('fileEditorModal');

  // Input fields
  uiElements.inputs.fileInput = document.getElementById('fileInput');
  uiElements.inputs.audioFileInput = document.getElementById('audioFileInput');
  uiElements.inputs.chunkUploadInput = document.getElementById('chunkUploadInput');
  uiElements.inputs.topPromptInput = document.getElementById('topPromptInput');
  uiElements.inputs.chatInput = document.getElementById('chatInput');
  uiElements.inputs.promptText = document.getElementById('promptText');
  uiElements.inputs.modelSelect = document.getElementById('modelSelect');

  // Action-specific buttons
  uiElements.actions.submitTopPrompt = document.getElementById('submitTopPrompt');
  uiElements.actions.submitChatMessage = document.getElementById('submitChatMessage');
  uiElements.actions.submitPrompt = document.getElementById('submitPrompt');
  uiElements.actions.startRecordingButton = document.getElementById('startRecordingButton');
  uiElements.actions.stopRecordingButton = document.getElementById('stopRecordingButton');
  uiElements.actions.saveFileButton = document.getElementById('saveFile');
  uiElements.actions.closeGestureModal = document.getElementById('closeGestureModal');
  uiElements.actions.closePromptModal = document.getElementById('closePromptModal');
  uiElements.actions.closeFileEditorModal = document.getElementById('closeFileEditorModal');

  console.log('Основной UI инициализирован.');

  // Assign collected UI elements to the global state for access by other modules.
  // This uses the 'appState' passed in from main.js, which is the global 'state' object.
  appState.uiElements = uiElements;

  // Add initialization for triaVersion label
  if (!appState.uiElements.labels) { appState.uiElements.labels = {}; }
  appState.uiElements.labels.triaVersion = document.getElementById('triaVersion');

  // For elements used by RightPanelManager and potentially others
  uiElements.containers.promptBar = document.getElementById('promptBar');
  uiElements.containers.chatInputBar = document.getElementById('chatInputBar');

  // It might be good to have a dedicated category for indicators
  if (!uiElements.indicators) {
    uiElements.indicators = {};
  }
  uiElements.indicators.loadingIndicator = document.getElementById('loadingIndicator');

  // Debugging: Verify if gestureArea and gridContainer are found and assigned.
  console.log('[UIManager] Проверка: gestureArea в appState.uiElements:', appState.uiElements.gestureArea ? 'найдена' : 'НЕ найдена', appState.uiElements.gestureArea);
  console.log('[UIManager] Проверка: gridContainer в appState.uiElements:', appState.uiElements.gridContainer ? 'найден' : 'НЕ найден', appState.uiElements.gridContainer);
  console.log('[UIManager] Проверка: leftPanel в appState.uiElements:', appState.uiElements.leftPanel ? 'найден' : 'НЕ найден');
  console.log('[UIManager] Проверка: rightPanel в appState.uiElements:', appState.uiElements.rightPanel ? 'найден' : 'НЕ найден');
  console.log('[UIManager] Проверка: togglePanelsButton в appState.uiElements:', appState.uiElements.togglePanelsButton ? 'найден' : 'НЕ найден');
  if (appState.uiElements.togglePanelsButton) {
    console.log('[UIManager] togglePanelsButton style.display:', appState.uiElements.togglePanelsButton.style.display);
    console.log('[UIManager] togglePanelsButton computed style display:', window.getComputedStyle(appState.uiElements.togglePanelsButton).display);
    console.log('[UIManager] togglePanelsButton visibility:', window.getComputedStyle(appState.uiElements.togglePanelsButton).visibility);
    console.log('[UIManager] togglePanelsButton opacity:', window.getComputedStyle(appState.uiElements.togglePanelsButton).opacity);
    console.log('[UIManager] togglePanelsButton computed left:', window.getComputedStyle(appState.uiElements.togglePanelsButton).left);
    console.log('[UIManager] togglePanelsButton computed position:', window.getComputedStyle(appState.uiElements.togglePanelsButton).position);
    console.log('[UIManager] togglePanelsButton computed transform:', window.getComputedStyle(appState.uiElements.togglePanelsButton).transform);
  }
  // Ensure these new elements are also logged or checked if you have debugging patterns for that.
  // For example, adding to logLayoutState or the verification console.logs:
  console.log('[UIManager] Проверка: triaVersion в appState.uiElements.labels:', appState.uiElements.labels.triaVersion ? 'найден' : 'НЕ найден', appState.uiElements.labels.triaVersion);
  console.log('[UIManager] Проверка: promptBar в appState.uiElements.containers:', appState.uiElements.containers.promptBar ? 'найден' : 'НЕ найден');
  console.log('[UIManager] Проверка: chatInputBar в appState.uiElements.containers:', appState.uiElements.containers.chatInputBar ? 'найден' : 'НЕ найден');
  console.log('[UIManager] Проверка: loadingIndicator в appState.uiElements.indicators:', appState.uiElements.indicators.loadingIndicator ? 'найден' : 'НЕ найден');

  // Инициализация контейнера для списка голограмм
  if (!appState.uiElements.containers) { appState.uiElements.containers = {}; }
  appState.uiElements.containers.hologramList = document.getElementById('myHologramsView'); // Используем существующий #myHologramsView
  if (!appState.uiElements.containers.hologramList) {
    console.warn("#myHologramsView (for hologram list) not found in DOM during UI setup. Hologram panel may not work.");
  } else {
    console.log("Hologram list container (#myHologramsView) successfully assigned to state.uiElements.containers.hologramList.");
  }

  // --- Initial UI State and Debugging ---
  // initializePanelState(); // PanelManager now handles this.
  addDebugClasses();      // Add debug classes for styling/inspection.
  logLayoutState();       // Log current layout dimensions for debugging.


  // --- Event Listeners ---

  // IMPORTANT: uiElements.buttons.fileButton (loadAudioButton) is ALSO used by audioFilePlayer.js
  // This will cause two file dialogs to open.
  // For now, commenting out the generic chunk upload trigger via this button.
  // This needs a dedicated UI element if it's to be user-triggered.
  if (uiElements.inputs.chunkUploadInput && uiElements.buttons.fileButton) {
    // setupChunkUpload(uiElements.inputs.chunkUploadInput, uiElements.buttons.fileButton);
    console.warn("Generic chunk upload via 'Load Audio' button is temporarily disabled due to conflict with audio file player. A dedicated UI button is needed.");
  } else {
    if (!uiElements.inputs.chunkUploadInput) console.warn("chunkUploadInput element not found. Generic file upload via this input is disabled.");
    // if (!uiElements.buttons.fileButton) console.warn("loadAudioButton element not found. Cannot trigger generic file upload."); // This warning might be confusing now
  }

  // --- Helper Function for Button Event Listeners ---
  /**
   * A utility function to attach a click listener to a button.
   * It includes logging and optionally awaits an asynchronous action.
   * @param {HTMLElement|null} button - The DOM button element.
   * @param {function(): Promise<void>|null} action - An optional async function to execute on click.
   * @param {string} logMessage - A message to log to the console when the button is clicked.
   */
  const addButtonListener = (button, action, logMessage) => {
    if (button) {
      button.addEventListener('click', async () => {
        if (typeof action === 'function') {
          await action(); // Execute and await the action if it's an async function.
        }
        if (logMessage) console.log(logMessage);
      });
    } else {
      // Warn if a button element expected in HTML was not found.
      console.warn(`Button element for action "${logMessage || 'Unknown Action'}" not found.`);
    }
  };

  // --- Audio Control Buttons ---
  // Event listeners for play, pause, stop are now handled by initializeAudioPlayerControls() in audioFilePlayer.js
  // Remove these addButtonListener calls.
  // addButtonListener(uiElements.buttons.playButton, null, "Play button clicked - functionality pending.");
  // addButtonListener(uiElements.buttons.pauseButton, null, "Pause button clicked - functionality pending.");
  // addButtonListener(uiElements.buttons.stopButton, null, "Stop button clicked - functionality pending.");

  // --- Microphone Toggle Button ---
  if (uiElements.buttons.micButton) {
    uiElements.buttons.micButton.addEventListener('click', async () => {
      if (appState.microphoneManagerInstance) {
        await appState.microphoneManagerInstance.toggleMicrophone(uiElements.buttons.micButton, appState);
      } else {
        console.error("MicrophoneManager instance not found in state. Cannot toggle microphone.");
        uiElements.buttons.micButton.textContent = "Mic Error";
      }
    });

    // Set initial mic button state based on the global audio state after page load.
    // This logic is now handled within toggleMicrophone based on initial state,
    // but we need to ensure the button's visual state is correct on load.
    // We can call toggleMicrophone once without click if we want to sync state,
    // or simply set class based on initial appState.audio.activeSource.
    // For now, let's ensure the class and title are set based on initial state.
    if (appState.audio && appState.audio.activeSource === 'microphone') {
      uiElements.buttons.micButton.classList.add('active');
      uiElements.buttons.micButton.title = "Выключить микрофон";
    } else {
      uiElements.buttons.micButton.classList.remove('active');
      uiElements.buttons.micButton.title = "Включить микрофон";
    }
  }

  // --- Fullscreen Toggle Button ---
  if (uiElements.buttons.fullscreenButton) {
    initFullscreenListeners(uiElements.buttons.fullscreenButton); // Keep for class toggling on fullscreenchange event
    uiElements.buttons.fullscreenButton.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      }
    });
  } else {
    console.warn("Fullscreen button element not found. Fullscreen toggle functionality disabled.");
  }

  // --- Other Feature Buttons ---
  if (uiElements.buttons.xrButton) {
    // Set initial button state
    if (appState.xrSessionManagerInstance && appState.xrSessionManagerInstance.isSessionActive()) {
      uiElements.buttons.xrButton.classList.add('active');
      uiElements.buttons.xrButton.title = "Exit XR Mode";
    } else {
      uiElements.buttons.xrButton.classList.remove('active');
      uiElements.buttons.xrButton.title = "Enter XR Mode";
    }

    uiElements.buttons.xrButton.addEventListener('click', async () => {
      try {
        // Step 1: Toggle WebXR session (Android XR priority)
        if (appState.xrSessionManagerInstance) {
          await appState.xrSessionManagerInstance.toggleXRSession(uiElements.buttons.xrButton);
        }

        // Step 2: Toggle Cochlear Cylinder morph (inside XR session or as fallback)
        if (appState.hologramRendererInstance) {
          const isXR = await appState.hologramRendererInstance.toggleXRMode();
          uiElements.buttons.xrButton.classList.toggle('active', isXR);
          uiElements.buttons.xrButton.title = isXR ? "Exit XR Mode" : "Enter XR Mode";
          console.log(`[UIManager] Cochlear Cylinder ${isXR ? 'activated' : 'deactivated'}`);
        }
      } catch (err) {
        console.warn('[UIManager] WebXR session failed, using Cochlear Cylinder fallback:', err.message);
        // Fallback: morph without WebXR session
        if (appState.hologramRendererInstance) {
          try {
            const isXR = await appState.hologramRendererInstance.toggleXRMode();
            uiElements.buttons.xrButton.classList.toggle('active', isXR);
            uiElements.buttons.xrButton.title = isXR ? "Exit XR Mode" : "Enter XR Mode";
            console.log(`[UIManager] Cochlear Cylinder fallback ${isXR ? 'activated' : 'deactivated'}`);
          } catch (fallbackErr) {
            console.error('[UIManager] Cochlear Cylinder fallback also failed:', fallbackErr);
            uiElements.buttons.xrButton.textContent = "XR Error";
          }
        }
      }
    });
  } else {
    console.warn("XR button element not found.");
  }

  // Gesture Record button also opens the 'My Gestures' panel.
  addButtonListener(uiElements.buttons.gestureRecordButton, () => {
    console.log("Gesture Record button clicked. Opening 'My Gestures' panel.");
    if (appState.panelManager) {
      appState.panelManager.openContentPanel('myGestures'); // Opens the specific panel for gestures.
    } else {
      console.error("PanelManager not found in state. Cannot open 'myGestures' panel.");
    }
  }, "Gesture Record button also attempts to open 'myGesturesView' panel.");

  // Synth Button (Performance Mode)
  if (uiElements.buttons.synthButton) {
    uiElements.buttons.synthButton.addEventListener('click', async () => {
      if (!appState.audio) appState.audio = {};
      appState.audio.isGestureSynthMode = !appState.audio.isGestureSynthMode;

      const isActive = appState.audio.isGestureSynthMode;
      uiElements.buttons.synthButton.classList.toggle('active', isActive);

      console.log(`[UIManager] Gesture Synth Mode: ${isActive ? 'ON' : 'OFF'}`);

      // Initialize and control GestureSynthesizer
      if (isActive) {
        await gestureSynthesizer.initialize();
        gestureSynthesizer.start();
        console.log('[UIManager] GestureSynthesizer started');
      } else {
        gestureSynthesizer.stop();
        console.log('[UIManager] GestureSynthesizer stopped');
      }
    });
  }

  // Hologram List button opens the 'My Holograms' panel.
  addButtonListener(uiElements.buttons.hologramListButton, () => {
    console.log("Hologram List button clicked. Opening 'My Holograms' panel.");
    if (appState.panelManager) {
      appState.panelManager.openContentPanel('myHolograms'); // Opens the specific panel for holograms.
    } else {
      console.error("PanelManager not found in state. Cannot open 'myHolograms' panel.");
    }
  }, "Hologram List button opens 'myHologramsView' panel.");

  // --- Scanner gap enforcement helper (ensures visible 1% gap when scanner-active is set) ---
  function enforceScannerGap() {
    const grid = document.getElementById('grid-container');
    const rightPanel = document.getElementById('right-panel');
    if (!grid || !rightPanel) return;
    if (!grid.classList.contains('scanner-active')) {
      grid.style.transform = '';
      return;
    }

    const gapPx = Math.round(window.innerWidth * 0.01);
    requestAnimationFrame(() => {
      const gridRect = grid.getBoundingClientRect();
      const rightRect = rightPanel.getBoundingClientRect();
      const currentGap = Math.max(0, rightRect.left - gridRect.right);

      if (currentGap >= gapPx) {
        grid.style.transform = '';
        return;
      }

      const extraNeeded = gapPx - currentGap + 2; // small buffer
      const baseShiftPx = Math.round(window.innerWidth * 0.01);
      const totalShiftPx = baseShiftPx + extraNeeded;
      grid.style.transform = `translateX(-${totalShiftPx}px)`;
      console.log(`[UIManager] enforceScannerGap applied — currentGap=${currentGap}px target=${gapPx}px shift=${totalShiftPx}px`);
    });
  }

  // Recompute gap on resize and when relevant DOM mutations occur
  window.addEventListener('resize', () => { enforceScannerGap(); });
  const gridObserver = new MutationObserver(() => enforceScannerGap());
  const rightObserver = new MutationObserver(() => enforceScannerGap());
  const gridEl = document.getElementById('grid-container');
  const rightEl = document.getElementById('right-panel');
  if (gridEl) gridObserver.observe(gridEl, { attributes: true, attributeFilter: ['class', 'style'] });
  if (rightEl) rightObserver.observe(rightEl, { attributes: true, attributeFilter: ['class', 'style'] });

  // --- Scanner Button ---
  // Toggles hologram scanning mode (camera → audio synthesis)
  if (uiElements.buttons.scanButton) {
    uiElements.buttons.scanButton.addEventListener('click', async () => {
      try {
        if (hologramScanner.isActive) {
          hologramScanner.stop();
          uiElements.buttons.scanButton.classList.remove('active');

          // Remove scanner-active class from grid container and any JS override
          const gridContainer = document.getElementById('grid-container');
          if (gridContainer) {
            gridContainer.classList.remove('scanner-active');
            gridContainer.style.transform = '';
          }

          console.log('[UIManager] Scanner stopped.');
        } else {
          await hologramScanner.start();
          uiElements.buttons.scanButton.classList.add('active');

          // Handle panel visibility based on device type
          const isMobilePortrait = window.innerWidth <= 768 || window.innerHeight > window.innerWidth;

          if (isMobilePortrait && appState.panelManager) {
            // Mobile: hide all content panels
            appState.panelManager.closeAllContentPanels();
            console.log('[UIManager] Scanner started on mobile - panels hidden.');
          } else {
            // Desktop: add scanner-active class to sideshift hologram
            const gridContainer = document.getElementById('grid-container');
            if (gridContainer) {
              gridContainer.classList.add('scanner-active');
              // enforce gap immediately after class is applied
              enforceScannerGap();
            }
            console.log('[UIManager] Scanner started on desktop - hologram shifted.');
          }

          console.log('[UIManager] Scanner started.');
        }
      } catch (error) {
        console.error('[UIManager] Scanner toggle failed:', error);
        uiElements.buttons.scanButton.classList.remove('active');
      }
    });
    console.log('[UIManager] Scanner button initialized.');
  }
  // addButtonListener(uiElements.buttons.bluetoothButton, null, "Bluetooth button clicked - functionality pending."); // Logic implemented elsewhere
  // addButtonListener(uiElements.buttons.triaButton, null, "Tria (Activate Training) button clicked - functionality pending."); // Logic implemented elsewhere

  // --- Bluetooth Button Default State ---
  if (uiElements.buttons.bluetoothButton) {
    uiElements.buttons.bluetoothButton.classList.add('disabled');
    // Fallback styling if 'disabled' class isn't enough or not defined
    uiElements.buttons.bluetoothButton.style.opacity = '0.5';
    uiElements.buttons.bluetoothButton.style.pointerEvents = 'none';
    console.log("Bluetooth button initialized as disabled.");
  } else {
    console.warn("Bluetooth button element not found, cannot set default disabled state.");
  }

  // --- External Link Buttons ---
  addButtonListener(uiElements.buttons.telegramLinkButton, () => window.open('https://t.me/hologramsmedia', '_blank'), "Telegram link button clicked.");
  addButtonListener(uiElements.buttons.githubButton, () => window.open('https://github.com/NeuroCoderZ/holograms.media/', '_blank'), "GitHub link button clicked.");

  // --- PWA Install Button ---
  // The event listener for installPwaButton has been removed as per the task.
  // The PWA installation is typically triggered by the browser's own UI prompts
  // or by a button managed by initializePwaInstall itself if it decides to show one.
  // The handleInstallButtonClick was likely called directly by this listener,
  // but initializePwaInstall should handle its own UI interactions.

  // --- Tria Button ---
  if (uiElements.buttons.triaButton && uiElements.inputs.modelSelect) {
    // Set initial state for Tria button and modelSelect
    if (appState.tria && typeof appState.tria.isLearningActive === 'boolean') {
      uiElements.buttons.triaButton.classList.toggle('active', appState.tria.isLearningActive);
      uiElements.inputs.modelSelect.disabled = appState.tria.isLearningActive;
    } else {
      // Initialize if appState.tria or isLearningActive is not properly set
      if (!appState.tria) appState.tria = {};
      appState.tria.isLearningActive = false; // Default to false
      uiElements.buttons.triaButton.classList.remove('active');
      uiElements.inputs.modelSelect.disabled = false;
    }

    uiElements.buttons.triaButton.addEventListener('click', () => {
      toggleTriaLearningMode(uiElements.buttons.triaButton, uiElements.inputs.modelSelect, appState);
    });
  } else {
    if (!uiElements.buttons.triaButton) console.warn("Tria button element not found.");
    if (!uiElements.inputs.modelSelect) console.warn("Model select element not found for Tria button logic.");
  }

  // --- Scanner Button ---
  // scanButton logic is now implemented above, removing the placeholder addButtonListener call for it.
  // Similarly for Tria and Bluetooth buttons, specific logic is replacing the placeholder logs.

  // --- Action Buttons (Delegated Handlers) ---
  // The event listeners for these buttons are typically set up in other specialized modules
  // that handle the specific logic for prompts, chat, file editing, and gesture recording modals.
  // - `uiElements.actions.submitTopPrompt`: Expected listener in `promptManager.js` or `main.js`.
  // - `uiElements.actions.submitChatMessage`: Expected listener in `chat.js`.
  // - `uiElements.actions.submitPrompt`: Expected listener in `promptManager.js`.
  // - `uiElements.actions.startRecordingButton`: Expected listener in `gesture.js` (or similar modal logic).
  // - `uiElements.actions.stopRecordingButton`: Expected listener in `gesture.js` (or similar modal logic).
  // - `uiElements.actions.saveFileButton`: Expected listener in `fileEditor.js`.
  // - `uiElements.actions.closeGestureModal`: Expected listener in modal control logic.
  // - `uiElements.actions.closePromptModal`: Expected listener in modal control logic.
  // - `uiElements.actions.closeFileEditorModal`: Expected listener in modal control logic.

  // Initialize PWA install logic
  initializePwaInstall();

  // Initialize Right Panel Logic
  initializeRightPanel(appState);
}

/**
 * Export functions that might be needed by other modules for UI manipulation or state.
 * initializePanelState and togglePanels are removed as PanelManager handles this.
 * toggleChatMode is removed as PanelManager.openContentPanel('chatHistory') handles this.
 */
export { logLayoutState };

// Ensure that PanelManager's methods like initializeMainPanelState are called
// after the main UI (including panels themselves) has been initialized.
// This might need to be called from main.js or after initializeMainUI() completes.
// For now, we assume that if state.panelManager is used, its methods are called
// when appropriate by the modules that need them (e.g., specific panel content initializers).
// The core initialization of PanelManager (finding elements, basic events) is done in its constructor or initializePanelManager.
// Methods like initializeMainPanelState might set up the *initial visibility state* of content within panels,
// so they should be called after those content elements are known to PanelManager.
// This refactoring centralizes PanelManager instance, not necessarily the timing of all its method calls.
// The original `panelManagerInstance.initializeMainPanelState(...)` was not present in the provided snippet,
// so it's assumed to be handled elsewhere or not immediately needed in `initializeMainUI` after this refactor.
// If it was, it should be `state.panelManager.initializeMainPanelState(...)` and called here if appropriate.
// Based on the task, the primary goal is to replace the instance, not to re-architect method call timing unless specified.
// The example showed `state.panelManager.initializeMainPanelState(...)` which implies it might be called from here.
// If `state.ui.mainPanel` etc. are defined and were used with the local instance, they should be used with the global one.
// However, `state.ui` is not part of the global `state` object shown in `init.js`.
// Assuming `initializeMainPanelState` is a method of PanelManager that takes the panel elements as arguments.
// Let's check panelManager.js for its definition. If it's meant to be called here,
// and it uses `state.ui.mainPanel`, that part of the state needs to exist.

// Revisiting the task: "Replace each of them with state.panelManager. This includes calls like panelManagerInstance.initializeMainPanelState()"
// This implies initializeMainPanelState was called on the local instance.
// The provided snippet did not show this call, but if it existed, it should be:
// state.panelManager.initializeMainPanelState(state.ui.mainPanel, state.ui.leftPanel, state.ui.rightPanel);
// Given state.ui is not defined in init.js, this call would fail.
// PanelManager's own initializePanelManager likely handles finding its core panel elements.
// initializeMainPanelState seems to be about specific content areas within those panels.
// For now, sticking to replacing the instance where it was directly used for openContentPanel.
// If initializeMainPanelState was indeed called in the original uiManager.js (not shown in the snippet),
// it should be `state.panelManager.initializeMainPanelState(args...)` here.
// The example `state.panelManager.initializeMainPanelState(state.ui.mainPanel, state.ui.leftPanel, state.ui.rightPanel);`
// suggests that state.ui.mainPanel, state.ui.leftPanel, state.ui.rightPanel should be valid references.
// However, these specific properties (state.ui.mainPanel etc.) are not standard and seem like application-specific logic
// that PanelManager itself would encapsulate by finding elements with specific IDs (e.g., 'main-panel', 'left-content-panel').

// The critical part is that PanelManager is now globally available via state.panelManager.
// Any module that previously would have instantiated it or received an instance
// should now access it via state.panelManager.

// The lines in initializeMainUI:
// uiElements.leftPanel = state.panelManager.leftPanelElement;
// uiElements.rightPanel = state.panelManager.rightPanelElement;
// uiElements.togglePanelsButton = state.panelManager.togglePanelsButtonElement;
// correctly assign the panel DOM elements (managed by the global PanelManager) to the local uiElements object
// for any other parts of uiManager that might still refer to them directly (though ideally, they'd also use state.panelManager).
// This is a good intermediate step.

// Also, removed the import of PanelManager from './panelManager.js' as it's no longer instantiated here.
// Added checks for state.panelManager before using its methods/properties.
