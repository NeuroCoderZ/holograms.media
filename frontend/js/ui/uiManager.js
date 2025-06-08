// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { state } from '../core/init.js';
import { auth } from '../core/firebaseInit.js';
// import { uploadFileToFirebaseStorage } from '../services/firebaseStorageService.js'; // Old Firebase Storage upload
import { uploadFileToR2 } from '../services/firebaseStorageService.js'; // New R2 upload via presigned URL
// import { uploadChunk } from '../services/apiService.js'; // Old direct backend upload, now replaced by R2 presigned
import { initializePwaInstall, handleInstallButtonClick } from '../core/pwaInstall.js';
import { setupChunkUpload } from '../services/firebaseStorageService.js'; // Import for chunk upload
// panelManager is used to switch visible content panels in the right sidebar.
import PanelManager from './panelManager.js';
import { toggleFullscreen, initFullscreenListeners } from '../utils/fullscreen.js'; // Import for fullscreen
import { toggleTriaLearningMode } from '../ai/tria.js'; // Import for Tria button

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
    hologramListButton: null,  // Button to open 'My Holograms' panel
    scanButton: null,         // Placeholder for scanning functionality
    bluetoothButton: null,    // Placeholder for Bluetooth connections (e.g., EEG devices)
    telegramLinkButton: null,  // Link to Telegram chat
    githubButton: null,       // Link to GitHub repository
    triaButton: null,         // Placeholder for activating Tria AI training/modes
    chatButton: null,         // Button to open the chat panel
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
export function initializeMainUI() {
  console.log('Инициализация основного UI...');
  
  // Создаем экземпляр PanelManager
  const panelManagerInstance = new PanelManager();
  panelManagerInstance.initializePanelManager(); // Инициализируем PanelManager

  // PanelManager now handles leftPanel, rightPanel, and togglePanelsButton references and initialization.
  // We can still assign them to uiElements if other parts of uiManager need them,
  // but their core logic is with PanelManager.
  uiElements.leftPanel = panelManagerInstance.leftPanelElement;
  uiElements.rightPanel = panelManagerInstance.rightPanelElement;
  uiElements.togglePanelsButton = panelManagerInstance.togglePanelsButtonElement;

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
  uiElements.buttons.hologramListButton = document.getElementById('hologramListButton');
  uiElements.buttons.scanButton = document.getElementById('scanButton');
  uiElements.buttons.bluetoothButton = document.getElementById('bluetoothButton');
  uiElements.buttons.telegramLinkButton = document.getElementById('telegramLinkButton');
  uiElements.buttons.githubButton = document.getElementById('githubButton');
  uiElements.buttons.triaButton = document.getElementById('triaButton'); // For "Activate Tria Training"
  uiElements.buttons.chatButton = document.getElementById('chatButton'); // For Toggling Chat Mode / Opening Chat Panel
  uiElements.buttons.installPwaButton = document.getElementById('installPwaButton');
  
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
  state.uiElements = uiElements;

  // Debugging: Verify if gestureArea and gridContainer are found and assigned.
  console.log('[UIManager] Проверка: gestureArea в state.uiElements:', state.uiElements.gestureArea ? 'найдена' : 'НЕ найдена', state.uiElements.gestureArea);
  console.log('[UIManager] Проверка: gridContainer в state.uiElements:', state.uiElements.gridContainer ? 'найден' : 'НЕ найден', state.uiElements.gridContainer);

  // --- Initial UI State and Debugging ---
  // initializePanelState(); // PanelManager now handles this.
  addDebugClasses();      // Add debug classes for styling/inspection.
  logLayoutState();       // Log current layout dimensions for debugging.


  // --- Event Listeners ---

  // Setup chunk upload functionality (moved to firebaseStorageService.js)
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
      if (state.microphoneManagerInstance) {
        await state.microphoneManagerInstance.toggleMicrophone(uiElements.buttons.micButton, state);
      } else {
        console.error("MicrophoneManager instance not found in state. Cannot toggle microphone.");
        uiElements.buttons.micButton.textContent = "Mic Error";
      }
    });

    // Set initial mic button state based on the global audio state after page load.
    // This logic is now handled within toggleMicrophone based on initial state,
    // but we need to ensure the button's visual state is correct on load.
    // We can call toggleMicrophone once without click if we want to sync state,
    // or simply set class based on initial state.audio.activeSource.
    // For now, let's ensure the class and title are set based on initial state.
    if (state.audio && state.audio.activeSource === 'microphone') {
        uiElements.buttons.micButton.classList.add('active');
        uiElements.buttons.micButton.title = "Выключить микрофон";
    } else {
        uiElements.buttons.micButton.classList.remove('active');
        uiElements.buttons.micButton.title = "Включить микрофон";
    }
  }

  // --- Fullscreen Toggle Button ---
  if (uiElements.buttons.fullscreenButton) {
    initFullscreenListeners(uiElements.buttons.fullscreenButton); // Initialize event listeners for robust class toggling
    uiElements.buttons.fullscreenButton.addEventListener('click', () => {
      toggleFullscreen(uiElements.buttons.fullscreenButton); // Call the utility function
      // console.log("Fullscreen button clicked."); // toggleFullscreen logs this now.
    });
  } else {
      console.warn("Fullscreen button element not found. Fullscreen toggle functionality disabled.");
  }

  // --- Other Feature Buttons ---
  if (uiElements.buttons.xrButton) {
    // Set initial button state
    if (state.xrSessionManagerInstance && state.xrSessionManagerInstance.isSessionActive()) {
      uiElements.buttons.xrButton.classList.add('active');
      uiElements.buttons.xrButton.title = "Exit XR Mode";
    } else {
      uiElements.buttons.xrButton.classList.remove('active');
      uiElements.buttons.xrButton.title = "Enter XR Mode";
    }

    uiElements.buttons.xrButton.addEventListener('click', async () => {
      if (state.xrSessionManagerInstance) {
        await state.xrSessionManagerInstance.toggleXRSession(uiElements.buttons.xrButton);
      } else {
        console.error("XRSessionManager instance not found in state. Cannot toggle XR session.");
        // Optionally provide visual feedback on the button itself
        uiElements.buttons.xrButton.textContent = "XR Error";
      }
    });
  } else {
    console.warn("XR button element not found.");
  }
  
  // Gesture Record button also opens the 'My Gestures' panel.
  addButtonListener(uiElements.buttons.gestureRecordButton, () => {
      console.log("Gesture Record button clicked. Opening 'My Gestures' panel.");
      panelManagerInstance.openContentPanel('myGestures'); // Opens the specific panel for gestures.
  }, "Gesture Record button also attempts to open 'myGesturesView' panel.");

  // Hologram List button opens the 'My Holograms' panel.
  addButtonListener(uiElements.buttons.hologramListButton, () => {
      console.log("Hologram List button clicked. Opening 'My Holograms' panel.");
      panelManagerInstance.openContentPanel('myHolograms'); // Opens the specific panel for holograms.
  }, "Hologram List button opens 'myHologramsView' panel.");

  // addButtonListener(uiElements.buttons.scanButton, null, "Scan button clicked - functionality pending."); // Logic implemented elsewhere
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
  // addButtonListener(uiElements.buttons.installPwaButton, null, "Install PWA button clicked - PWA installation logic to be implemented.");
  if (uiElements.buttons.installPwaButton) {
    uiElements.buttons.installPwaButton.addEventListener('click', () => {
      handleInstallButtonClick(); // Call the handler from pwaInstall.js
    });
  } else {
    console.warn("Install PWA button element not found.");
  }

  // --- Chat Panel Button ---
  // This button's primary role is to open the chat interface.
  if (uiElements.buttons.chatButton) {
    uiElements.buttons.chatButton.addEventListener('click', () => {
        console.log("Chat Mode/Panel button clicked. Opening 'chatHistory' panel.");
        panelManagerInstance.openContentPanel('chatHistory'); // Opens the dedicated chat history panel.
    });
  } else {
      console.warn("Chat button (for toggling chat mode/panel) not found. Chat panel access disabled.");
  }

  // --- Tria Button ---
  if (uiElements.buttons.triaButton && uiElements.inputs.modelSelect) {
    // Set initial state for Tria button and modelSelect
    if (state.tria && typeof state.tria.isLearningActive === 'boolean') {
      uiElements.buttons.triaButton.classList.toggle('active', state.tria.isLearningActive);
      uiElements.inputs.modelSelect.disabled = state.tria.isLearningActive;
    } else {
      // Initialize if state.tria or isLearningActive is not properly set
      if (!state.tria) state.tria = {};
      state.tria.isLearningActive = false; // Default to false
      uiElements.buttons.triaButton.classList.remove('active');
      uiElements.inputs.modelSelect.disabled = false;
    }

    uiElements.buttons.triaButton.addEventListener('click', () => {
      toggleTriaLearningMode(uiElements.buttons.triaButton, uiElements.inputs.modelSelect, state);
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
}

/**
 * Export functions that might be needed by other modules for UI manipulation or state.
 * initializePanelState and togglePanels are removed as PanelManager handles this.
 * toggleChatMode is removed as PanelManager.openContentPanel('chatHistory') handles this.
 */
export { logLayoutState };
