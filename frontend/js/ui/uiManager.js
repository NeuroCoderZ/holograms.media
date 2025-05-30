// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { loadPanelsHiddenState, savePanelsHiddenState } from '../core/appStatePersistence.js';
import { state } from '../core/init.js';
import { auth } from '../core/firebaseInit.js';
import { uploadFileToFirebaseStorage } from '../services/firebaseStorageService.js';
import panelManager, { openContentPanel, closeAllContentPanels } from './panelManager.js'; // Adjusted import

// Объект для хранения ссылок на DOM-элементы
export const uiElements = {
  // Кнопки левой панели
  buttons: {
    fileButton: null,
    playButton: null,
    pauseButton: null,
    stopButton: null,
    micButton: null,
    fullscreenButton: null,
    xrButton: null,
    gestureRecordButton: null,
    scanButton: null,
    bluetoothButton: null,
    telegramLinkButton: null,
    githubButton: null,
    triaButton: null,
    chatButton: null,
  },
  
  // Элементы правой панели
  versionTimeline: null,
  chatHistory: null,
  
  // Контейнеры
  gridContainer: null,
  gestureArea: null,
  containers: {
    chatMessages: null // Добавляем контейнер для чата
  },
  
  // Модальные окна
  modals: {
    gestureModal: null,
    promptModal: null,
  },
  
  // Элементы ввода
  inputs: {
    fileInput: null, // This might be for a different purpose, leaving as is.
    audioFileInput: null, // Added for the audio file input
    chunkUploadInput: null, // Added for generic chunk upload
    topPromptInput: null,
    chatInput: null,
    promptText: null,
    modelSelect: null,
  },
  
  // Кнопки действий
  actions: {
    submitTopPrompt: null,
    submitChatMessage: null,
    submitPrompt: null,
    startRecordingButton: null,
    stopRecordingButton: null,
  },
  
  // Другие элементы UI
  leftPanel: null,
  rightPanel: null,
  togglePanelsButton: null
};

/**
 * Инициализирует состояние панелей (видимость/скрытие)
 */
function initializePanelState() {
  // Проверяем наличие панелей
  if (!uiElements.leftPanel || !uiElements.rightPanel || !uiElements.togglePanelsButton) {
    console.error('Не удалось найти панели интерфейса для initializePanelState');
    return;
  }
  
  // Загружаем сохраненное состояние через appStatePersistence
  const shouldBeHidden = loadPanelsHiddenState();

  // Применяем классы, если состояние было загружено
  if (shouldBeHidden !== null) {
    uiElements.leftPanel.classList.toggle('hidden', shouldBeHidden);
    uiElements.rightPanel.classList.toggle('hidden', shouldBeHidden);
    uiElements.togglePanelsButton.classList.toggle('show-mode', shouldBeHidden);
  }

  // Вызываем ресайз после применения классов
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 50);
}

/**
 * Переключает видимость боковых панелей
 */
export function togglePanels() {
  if (!uiElements.leftPanel || !uiElements.rightPanel || !uiElements.togglePanelsButton) {
    console.error('Панели не инициализированы для togglePanels');
    return;
  }
  
  // Переключаем класс hidden для обеих панелей
  uiElements.leftPanel.classList.toggle('hidden');
  uiElements.rightPanel.classList.toggle('hidden');
  
  // Переключаем класс для кнопки
  uiElements.togglePanelsButton.classList.toggle('show-mode');
  
  // Сохраняем состояние через appStatePersistence
  const isPanelsHidden = uiElements.leftPanel.classList.contains('hidden');
  savePanelsHiddenState(isPanelsHidden);
  
  // Обновляем состояние в глобальной переменной state
  state.isPanelsHidden = isPanelsHidden;
  
  // Вызываем ресайз для обновления размеров
  window.dispatchEvent(new Event('resize'));
  
  console.log(`Панели ${isPanelsHidden ? 'скрыты' : 'показаны'}`);
}

/**
 * Добавляет отладочные классы к элементам
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

function logLayoutState() {
  console.log('Текущее состояние макета UI:');
  console.log('Левая панель:', uiElements.leftPanel ? uiElements.leftPanel.getBoundingClientRect() : 'не найдена');
  console.log('Правая панель:', uiElements.rightPanel ? uiElements.rightPanel.getBoundingClientRect() : 'не найдена');
  console.log('Контейнер сетки:', uiElements.gridContainer ? uiElements.gridContainer.getBoundingClientRect() : 'не найдена');
  console.log('Область жестов:', uiElements.gestureArea ? uiElements.gestureArea.getBoundingClientRect() : 'не найдена');
  console.log('Контейнер чата:', uiElements.containers.chatMessages ? uiElements.containers.chatMessages.getBoundingClientRect() : 'не найдена');
}

/**
 * Инициализирует основной UI приложения
 * Находит DOM-элементы, устанавливает начальное состояние и назначает обработчики событий
 */
export function initializeMainUI() {
  console.log('Инициализация основного UI...');
  
  // Получаем ссылки на DOM-элементы кнопок левой панели
  uiElements.buttons.fileButton = document.getElementById('loadAudioButton');
  uiElements.buttons.playButton = document.getElementById('playAudioButton');
  uiElements.buttons.pauseButton = document.getElementById('pauseAudioButton'); // Corrected ID
  uiElements.buttons.stopButton = document.getElementById('stopAudioButton');   // Corrected ID
  uiElements.buttons.micButton = document.getElementById('micButton');
  uiElements.buttons.fullscreenButton = document.getElementById('fullscreenButton');
  uiElements.buttons.xrButton = document.getElementById('xrButton');
  uiElements.buttons.gestureRecordButton = document.getElementById('gestureRecordButton');
  uiElements.buttons.scanButton = document.getElementById('scanButton');
  uiElements.buttons.bluetoothButton = document.getElementById('bluetoothButton');
  uiElements.buttons.telegramLinkButton = document.getElementById('telegramLinkButton');
  uiElements.buttons.githubButton = document.getElementById('githubButton');
  uiElements.buttons.triaButton = document.getElementById('triaButton'); // For "Activate Tria Training"
  uiElements.buttons.chatButton = document.getElementById('chatButton'); // For Toggling Chat Mode / Opening Chat Panel
  uiElements.buttons.installPwaButton = document.getElementById('installPwaButton'); // Added install PWA button
  
  // Получаем ссылки на элементы правой панели
  uiElements.versionTimeline = document.getElementById('versionTimeline');
  uiElements.chatHistory = document.getElementById('chatMessages');
  
  // Получаем ссылки на контейнеры
  uiElements.gridContainer = document.getElementById('grid-container');
  uiElements.gestureArea = document.getElementById('gesture-area');
  uiElements.containers.chatMessages = document.getElementById('chatMessages'); // Инициализируем контейнер чата
  
  // Получаем ссылки на модальные окна
  uiElements.modals.gestureModal = document.getElementById('gestureModal');
  uiElements.modals.promptModal = document.getElementById('promptModal');
  
  // Получаем ссылки на элементы ввода
  uiElements.inputs.fileInput = document.getElementById('fileInput'); // Remains, in case used for non-audio purposes
  uiElements.inputs.audioFileInput = document.getElementById('audioFileInput'); // Added for audio file input
  uiElements.inputs.chunkUploadInput = document.getElementById('chunkUploadInput'); // Added for generic chunk upload
  uiElements.inputs.topPromptInput = document.getElementById('topPromptInput');
  uiElements.inputs.chatInput = document.getElementById('chatInput');
  uiElements.inputs.promptText = document.getElementById('promptText');
  uiElements.inputs.modelSelect = document.getElementById('modelSelect');
  
  // Получаем ссылки на кнопки действий
  uiElements.actions.submitTopPrompt = document.getElementById('submitTopPrompt');
  uiElements.actions.submitChatMessage = document.getElementById('submitChatMessage');
  uiElements.actions.submitPrompt = document.getElementById('submitPrompt');
  uiElements.actions.startRecordingButton = document.getElementById('startRecordingButton');
  uiElements.actions.stopRecordingButton = document.getElementById('stopRecordingButton');
  
  // Получаем ссылки на другие элементы UI
  uiElements.leftPanel = document.querySelector('.panel.left-panel');
  uiElements.rightPanel = document.querySelector('.panel.right-panel');
  uiElements.togglePanelsButton = document.getElementById('togglePanelsButton');

  console.log('Основной UI инициализирован.');

  // Инициализируем состояние панелей после получения ссылок
  initializePanelState();

  // Добавляем отладочные классы
  addDebugClasses();

  // Логируем состояние макета
  logLayoutState();

  // Присваиваем собранные UI элементы глобальному состоянию
  state.uiElements = uiElements;

  // Event listener for generic chunk upload
  if (uiElements.inputs.chunkUploadInput && uiElements.buttons.fileButton) {
    // Assuming loadAudioButton is the visible button that triggers the hidden chunkUploadInput
    uiElements.buttons.fileButton.addEventListener('click', () => {
        if (uiElements.inputs.chunkUploadInput) {
            uiElements.inputs.chunkUploadInput.click();
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
        alert("Please sign in to upload files.");
        console.error("User not signed in. Cannot upload file.");
        // Clear the file input
        if (uiElements.inputs.chunkUploadInput) uiElements.inputs.chunkUploadInput.value = "";
        return;
      }

      const firebaseUserId = currentUser.uid;

      // Simple UI feedback (can be improved with a dedicated status element)
      const originalButtonText = event.target.previousElementSibling ? event.target.previousElementSibling.textContent : "";
      const setStatus = (message) => {
          // Attempt to find a related button or status area to show message
          // For now, using alert and console.log
          console.log(message);
          alert(message); // Replace with better UI feedback
      };

      setStatus(`Uploading ${file.name}...`);

      try {
        const storagePath = await uploadFileToFirebaseStorage(file, firebaseUserId);
        setStatus(`Upload complete! File available at: ${storagePath}`);
        console.log(`File uploaded to: ${storagePath}`);
        // TODO: Potentially emit an event or call another function with storagePath and file metadata
        // eventBus.emit('fileUploadedToStorage', { storagePath, file });
      } catch (error) {
        setStatus(`Upload failed for ${file.name}. Error: ${error.message}`);
        console.error("Error uploading file:", error);
      } finally {
          // Clear the file input for the next upload
          if (uiElements.inputs.chunkUploadInput) uiElements.inputs.chunkUploadInput.value = "";
      }
    });
  } else {
    if (!uiElements.inputs.chunkUploadInput) console.warn("chunkUploadInput element not found. Generic file upload via this input is disabled.");
    if (!uiElements.buttons.fileButton) console.warn("loadAudioButton element not found. Cannot trigger generic file upload.");
  }

  // --- Standard Button Event Listeners ---
  const addButtonListener = (button, action, logMessage) => {
    if (button) {
      button.addEventListener('click', async () => { // Made async for mic button
        if (typeof action === 'function') {
          await action(); // Await if action is async (like mic toggle)
        }
        if (logMessage) console.log(logMessage);
      });
    } else {
      // Log that the button was not found, helps in debugging missing HTML elements
      const buttonId = Object.keys(uiElements.buttons).find(key => uiElements.buttons[key] === button);
      console.warn(`Button element for action "${logMessage || buttonId || 'Unknown Action'}" not found.`);
    }
  };

  // Audio Controls
  addButtonListener(uiElements.buttons.playButton, null, "Play button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.pauseButton, null, "Pause button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.stopButton, null, "Stop button clicked - functionality pending.");

  // Mic Button
  if (uiElements.buttons.micButton) {
    uiElements.buttons.micButton.addEventListener('click', async () => {
      if (!state.microphoneManagerInstance || !state.audioAnalyzerLeftInstance || !state.audioAnalyzerRightInstance) {
        console.error("MicrophoneManager or AudioAnalyzers not initialized in state.");
        uiElements.buttons.micButton.textContent = "Mic Error";
        return;
      }
      try {
        if (state.audio.activeSource === 'microphone') {
          state.microphoneManagerInstance.stop();
          state.audio.activeSource = 'none';
          uiElements.buttons.micButton.classList.remove('active');
          uiElements.buttons.micButton.title = "Включить микрофон";
          console.log("Microphone stopped via UI button.");
        } else {
          // Re-initialize microphone and update analysers
          const { analyserLeft, analyserRight, audioContext } = await state.microphoneManagerInstance.init();
          state.audio.audioContext = audioContext; // Update context if it could change
          state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };

          // Crucially update the analyser nodes in the existing AudioAnalyzer instances
          state.audioAnalyzerLeftInstance.analyserNode = analyserLeft;
          state.audioAnalyzerRightInstance.analyserNode = analyserRight;
          // If AudioAnalyzer also held a reference to audioContext, it might need updating too.
          // Current AudioAnalyzer takes audioContext in constructor but doesn't seem to re-use it post-init.

          state.audio.activeSource = 'microphone';
          uiElements.buttons.micButton.classList.add('active');
          uiElements.buttons.micButton.title = "Выключить микрофон";
          console.log("Microphone started via UI button.");
        }
      } catch (error) {
        console.error("Error toggling microphone:", error);
        uiElements.buttons.micButton.textContent = "Mic Error";
        state.audio.activeSource = 'none'; // Ensure it's reset on error
      }
    });
    // Set initial mic button state based on state.audio.activeSource (e.g. after page load)
    if (state.audio.activeSource === 'microphone') {
        uiElements.buttons.micButton.classList.add('active');
        uiElements.buttons.micButton.title = "Выключить микрофон";
    } else {
        uiElements.buttons.micButton.classList.remove('active');
        uiElements.buttons.micButton.title = "Включить микрофон";
    }
  } else {
      console.warn("Mic button element not found.");
  }

  // Fullscreen Button
  if (uiElements.buttons.fullscreenButton) {
    uiElements.buttons.fullscreenButton.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
        // Consider changing button icon/text to "Exit Fullscreen"
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
          // Consider changing button icon/text back to "Enter Fullscreen"
        }
      }
      console.log("Fullscreen button clicked.");
    });
  } else {
      console.warn("Fullscreen button element not found.");
  }

  // Other Feature Buttons
  addButtonListener(uiElements.buttons.xrButton, null, "XR button clicked - functionality pending.");
  // gestureRecordButton opens a modal, specific logic might be in domEventHandlers.js or elsewhere
  // For now, ensure it's clickable and add panel opening if that's also intended.
  addButtonListener(uiElements.buttons.gestureRecordButton, () => {
      console.log("Gesture Record button clicked - modal logic likely elsewhere.");
      // As per subtask, also try to open its panel view
      openContentPanel('myGestures');
  }, "Gesture Record button also attempts to open 'myGestures' panel.");

  addButtonListener(uiElements.buttons.hologramListButton, () => openContentPanel('myHolograms'), "Hologram List button clicked - opening 'myHolograms' panel.");
  addButtonListener(uiElements.buttons.scanButton, null, "Scan button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.bluetoothButton, null, "Bluetooth button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.triaButton, null, "Tria (Activate Training) button clicked - functionality pending.");

  // Link Buttons
  addButtonListener(uiElements.buttons.telegramLinkButton, () => window.open('https://t.me/holograms_media', '_blank'), "Telegram link button clicked.");
  addButtonListener(uiElements.buttons.githubButton, () => window.open('https://github.com/Holograms-Media', '_blank'), "GitHub link button clicked.");

  // PWA Install Button
  addButtonListener(uiElements.buttons.installPwaButton, null, "Install PWA button clicked - PWA installation logic to be implemented.");

  // Chat Panel Button (Note: chatUI.js handles sending messages, uiManager handles panel/mode toggling)
  // The chatButton's role is primarily to toggle the chat interface visibility (handled by 'chat-mode' CSS)
  // and potentially open the specific chatHistory panel via panelManager if it's not already visible.
  if (uiElements.buttons.chatButton) {
    uiElements.buttons.chatButton.addEventListener('click', () => {
        // This button's primary role is to toggle 'chat-mode' which is likely handled
        // by a different mechanism (e.g., in tria_mode.js or main.js by toggling classes on body/containers).
        // Here, we ensure the specific chat panel content is made visible via panelManager.
        // It assumes that entering "chat mode" should always show the chat history panel.
        console.log("Chat Mode/Panel button clicked.");
        openContentPanel('chatHistory');
        // If there's a global state.isChatMode, it should be toggled by the mode switching logic.
        // This click listener here focuses on ensuring the panel itself is shown.
    });
  } else {
      console.warn("Chat button (for toggling chat mode/panel) not found.");
  }

}

/**
 * Переключает режим чата (видимость панели чата)
 */
export function toggleChatMode() {
  if (!uiElements.chatHistory) {
    console.error('Контейнер истории чата не инициализирован для toggleChatMode');
    return;
  }

  const isChatHidden = uiElements.chatHistory.classList.toggle('hidden');
  console.log(`Панель чата ${isChatHidden ? 'скрыта' : 'показана'}`);

  // Вызываем ресайз для обновления размеров, если это влияет на макет
  window.dispatchEvent(new Event('resize'));
}

// Экспортируем функции, которые могут понадобиться другим модулям
export { initializePanelState, logLayoutState };

// Удаляем неиспользуемый экспорт getPanelWidths (сделали локальной или удалим если не нужна)

// TODO: Добавить инициализацию других UI элементов по мере необходимости
// TODO: Рассмотреть возможность использования более надежного способа получения элементов, например, через классы или атрибуты данных, если ID не уникальны или могут меняться.