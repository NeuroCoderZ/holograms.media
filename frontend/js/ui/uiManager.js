// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { loadPanelsHiddenState, savePanelsHiddenState } from '../core/appStatePersistence.js';
import { state } from '../core/init.js';
import { auth } from '../core/firebaseInit.js';
import { uploadFileToFirebaseStorage } from '../services/firebaseStorageService.js';
import { initializePwaInstall, handleInstallButtonClick } from '../core/pwaInstall.js';
// panelManager is used to switch visible content panels in the right sidebar.
import PanelManager from './panelManager.js';

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
  leftPanel: null,          // Reference to the left sidebar DOM element
  rightPanel: null,         // Reference to the right sidebar DOM element
  togglePanelsButton: null, // Button to hide/show both side panels
};

/**
 * Initializes the hidden/visible state of the side panels based on user preferences
 * persisted in local storage. Applies CSS classes and triggers a resize event.
 */
function initializePanelState() {
  // Ensure essential panel elements are available before attempting to initialize.
  if (!uiElements.leftPanel || !uiElements.rightPanel || !uiElements.togglePanelsButton) {
    console.error('Не удалось найти панели интерфейса для initializePanelState');
    return;
  }
  
  // Load the saved state (true if panels should be hidden) using appStatePersistence.
  const shouldBeHidden = loadPanelsHiddenState();

  // Apply the 'hidden' class to panels and 'show-mode' to the toggle button if state was loaded.
  if (shouldBeHidden !== null) {
    uiElements.leftPanel.classList.toggle('hidden', shouldBeHidden);
    uiElements.rightPanel.classList.toggle('hidden', shouldBeHidden);
    uiElements.togglePanelsButton.classList.toggle('show-mode', shouldBeHidden);
  }

  // Dispatch a resize event after applying classes to ensure other modules (e.g., 3D renderer)
  // adjust to the new layout dimensions. A small timeout ensures CSS transitions complete.
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 50);
}

/**
 * Toggles the visibility of the left and right side panels.
 * Persists the new state and triggers a resize event.
 */
export function togglePanels() {
  // Ensure essential panel elements are available.
  if (!uiElements.leftPanel || !uiElements.rightPanel || !uiElements.togglePanelsButton) {
    console.error('Панели не инициализированы для togglePanels');
    return;
  }
  
  // Toggle the 'hidden' CSS class on both panels.
  uiElements.leftPanel.classList.toggle('hidden');
  uiElements.rightPanel.classList.toggle('hidden');
  
  // Toggle the 'show-mode' class on the toggle button to change its icon/appearance.
  uiElements.togglePanelsButton.classList.toggle('show-mode');
  
  // Save the current visibility state to local storage.
  const isPanelsHidden = uiElements.leftPanel.classList.contains('hidden');
  savePanelsHiddenState(isPanelsHidden);
  
  // Update the global application state.
  state.isPanelsHidden = isPanelsHidden;
  
  // Dispatch a resize event to inform other layout-dependent modules.
  window.dispatchEvent(new Event('resize'));
  
  console.log(`Панели ${isPanelsHidden ? 'скрыты' : 'показаны'}`);
}

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
  // PanelManager will initialize its own references. uiManager also needs references
  // for functions like initializePanelState and logLayoutState if they are to use uiManager's uiElements.
  uiElements.leftPanel = document.querySelector('.panel.left-panel');
  uiElements.rightPanel = document.querySelector('.panel.right-panel');
  uiElements.togglePanelsButton = document.getElementById('togglePanelsButton'); // Used by initializePanelState

  panelManagerInstance.initializePanelManager(); // Инициализируем PanelManager

  // --- Get references to all interactive UI elements by ID ---
  // Buttons in the left panel
  // Note: uiElements.togglePanelsButton is already assigned above.
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

  // --- Initial UI State and Debugging ---
  initializePanelState(); // Set initial panel visibility.
  addDebugClasses();      // Add debug classes for styling/inspection.
  logLayoutState();       // Log current layout dimensions for debugging.

  // Assign collected UI elements to the global state for access by other modules.
  state.uiElements = uiElements;

  // --- Event Listeners ---

  // Event listener for generic chunk upload via a hidden file input.
  // The `fileButton` (visually present) triggers a click on `chunkUploadInput` (hidden).
  if (uiElements.inputs.chunkUploadInput && uiElements.buttons.fileButton) {
    uiElements.buttons.fileButton.addEventListener('click', () => {
        if (uiElements.inputs.chunkUploadInput) {
            uiElements.inputs.chunkUploadInput.click(); // Programmatically click the hidden input.
        }
    });
    uiElements.inputs.chunkUploadInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) {
        console.log("No file selected.");
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("Please sign in to upload files."); // Basic user feedback
        console.error("User not signed in. Cannot upload file.");
        if (uiElements.inputs.chunkUploadInput) uiElements.inputs.chunkUploadInput.value = ""; // Clear input
        return;
      }

      const firebaseUserId = currentUser.uid;

      // Simple UI feedback mechanism. Replace `alert` with a more sophisticated notification system.
      const setStatus = (message) => {
          console.log(message);
          // alert(message); 
      };

      setStatus(`Uploading ${file.name}...`);

      try {
        // Call the service to upload the file to Firebase Storage.
        const storagePath = await uploadFileToFirebaseStorage(file, firebaseUserId);
        setStatus(`Upload complete! File available at: ${storagePath}`);
        console.log(`File uploaded to: ${storagePath}`);
        // TODO: After successful upload, potentially emit an event (via eventBus) or call 
        // another function to trigger backend processing (e.g., process_chunk HTTP trigger).
        // eventBus.emit('fileUploadedToStorage', { storagePath, file });
      } catch (error) {
        setStatus(`Upload failed for ${file.name}. Error: ${error.message}`);
        console.error("Error uploading file:", error);
      } finally {
          // Always clear the file input after an attempt, regardless of success or failure.
          if (uiElements.inputs.chunkUploadInput) uiElements.inputs.chunkUploadInput.value = "";
      }
    });
  } else {
    // Log warnings if critical elements for chunk upload are missing.
    if (!uiElements.inputs.chunkUploadInput) console.warn("chunkUploadInput element not found. Generic file upload via this input is disabled.");
    if (!uiElements.buttons.fileButton) console.warn("loadAudioButton element not found. Cannot trigger generic file upload.");
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
  // Current functionality is pending, so these buttons only log their clicks.
  addButtonListener(uiElements.buttons.playButton, null, "Play button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.pauseButton, null, "Pause button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.stopButton, null, "Stop button clicked - functionality pending.");

  // --- Microphone Toggle Button ---
  // This button has specific inline logic due to direct interaction with audio state and managers.
  if (uiElements.buttons.micButton) {
    uiElements.buttons.micButton.addEventListener('click', async () => {
      // Ensure audio managers are initialized before attempting to toggle microphone.
      if (!state.microphoneManagerInstance || !state.audioAnalyzerLeftInstance || !state.audioAnalyzerRightInstance) {
        console.error("MicrophoneManager or AudioAnalyzers not initialized in state. Cannot toggle microphone.");
        uiElements.buttons.micButton.textContent = "Mic Error"; // Provide visual feedback for error.
        return;
      }
      try {
        if (state.audio.activeSource === 'microphone') {
          // If microphone is currently active, stop it.
          state.microphoneManagerInstance.stop();
          state.audio.activeSource = 'none';
          uiElements.buttons.micButton.classList.remove('active'); // Update button visual state.
          uiElements.buttons.micButton.title = "Включить микрофон";
          console.log("Microphone stopped via UI button.");
        } else {
          // If microphone is not active, initialize/start it.
          // This re-initializes the microphone and updates the analyser nodes in the audio analyzer instances.
          const { analyserLeft, analyserRight, audioContext } = await state.microphoneManagerInstance.init();
          state.audio.audioContext = audioContext;
          state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };

          state.audioAnalyzerLeftInstance.analyserNode = analyserLeft; // Update analyser node reference.
          state.audioAnalyzerRightInstance.analyserNode = analyserRight; // Update analyser node reference.

          state.audio.activeSource = 'microphone';
          uiElements.buttons.micButton.classList.add('active'); // Update button visual state.
          uiElements.buttons.micButton.title = "Выключить микрофон";
          console.log("Microphone started via UI button.");
        }
      } catch (error) {
        console.error("Error toggling microphone:", error);
        uiElements.buttons.micButton.textContent = "Mic Error";
        state.audio.activeSource = 'none'; // Reset active source on error.
      }
    });
    // Set initial mic button state based on the global audio state after page load.
    if (state.audio.activeSource === 'microphone') {
        uiElements.buttons.micButton.classList.add('active');
        uiElements.buttons.micButton.title = "Выключить микрофон";
    } else {
        uiElements.buttons.micButton.classList.remove('active');
        uiElements.buttons.micButton.title = "Включить микрофон";
    }
  } else {
      console.warn("Mic button element not found. Microphone toggle functionality disabled.");
  }

  // --- Fullscreen Toggle Button ---
  if (uiElements.buttons.fullscreenButton) {
    uiElements.buttons.fullscreenButton.addEventListener('click', () => {
      // Toggle fullscreen mode for the entire document.
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      console.log("Fullscreen button clicked.");
    });
  } else {
      console.warn("Fullscreen button element not found. Fullscreen toggle functionality disabled.");
  }

  // --- Other Feature Buttons ---
  // addButtonListener(uiElements.buttons.xrButton, null, "XR button clicked - functionality pending."); // Replaced with specific logic below
  if (uiElements.buttons.xrButton) {
    uiElements.buttons.xrButton.addEventListener('click', () => {
      console.log("Переключение на XR режим голограммы - функционал в разработке");
      uiElements.buttons.xrButton.classList.toggle('active');
    });
  } else {
    console.warn("XR button element not found.");
  }
  
  // Gesture Record button also opens the 'My Gestures' panel.
  addButtonListener(uiElements.buttons.gestureRecordButton, () => {
      console.log("Gesture Record button clicked. Opening 'My Gestures' panel.");
      panelManagerInstance.openContentPanel('myGesturesView'); // Opens the specific panel for gestures.
  }, "Gesture Record button also attempts to open 'myGesturesView' panel.");

  // Hologram List button opens the 'My Holograms' panel.
  addButtonListener(uiElements.buttons.hologramListButton, () => {
      console.log("Hologram List button clicked. Opening 'My Holograms' panel.");
      panelManagerInstance.openContentPanel('myHologramsView'); // Opens the specific panel for holograms.
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
    uiElements.buttons.triaButton.addEventListener('click', () => {
      // Ensure state.tria exists
      if (!state.tria) {
        state.tria = { isLearningActive: false };
      }
      state.tria.isLearningActive = !state.tria.isLearningActive;

      uiElements.buttons.triaButton.classList.toggle('active', state.tria.isLearningActive);
      uiElements.inputs.modelSelect.disabled = state.tria.isLearningActive;

      console.log(`Tria button clicked. isLearningActive: ${state.tria.isLearningActive}`);
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
 * Toggles the visibility of the chat history panel.
 * NOTE: This function might be redundant or conflict with `panelManager.openContentPanel('chatHistory')`
 * if the goal is only to show/hide the panel. Re-evaluate if both are necessary or if `panelManager` is sufficient.
 */
export function toggleChatMode() {
  if (!uiElements.chatHistory) {
    console.error('Контейнер истории чата не инициализирован для toggleChatMode');
    return;
  }

  const isChatHidden = uiElements.chatHistory.classList.toggle('hidden');
  console.log(`Панель чата ${isChatHidden ? 'скрыта' : 'показана'}`);

  // Dispatch a resize event to ensure layout adjusts correctly after panel visibility change.
  window.dispatchEvent(new Event('resize'));
}

// Export functions that might be needed by other modules for UI manipulation or state. 
export { initializePanelState, logLayoutState };
