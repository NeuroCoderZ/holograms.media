// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { loadPanelsHiddenState, savePanelsHiddenState } from '../core/appStatePersistence.js';
import { state } from '../core/init.js';
import { auth } from '../core/firebaseInit.js';
import { uploadFileToFirebaseStorage } from '../services/firebaseStorageService.js';
import panelManager, { openContentPanel, closeAllContentPanels } from './panelManager.js';

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
    hologramListButton: null, // Добавлено явно
    scanButton: null,
    bluetoothButton: null,
    telegramLinkButton: null,
    githubButton: null,
    triaButton: null,
    chatButton: null,
    installPwaButton: null,
  },
  
  // Элементы правой панели
  versionTimeline: null,
  chatHistory: null, // Контейнер для сообщений чата
  
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
    fileEditorModal: null, // Добавлено для редактора файлов
  },
  
  // Элементы ввода
  inputs: {
    fileInput: null,
    audioFileInput: null,
    chunkUploadInput: null,
    topPromptInput: null,
    chatInput: null,
    promptText: null,
    modelSelect: null,
  },
  
  // Кнопки действий (их обработчики могут быть в других модулях, но ссылки на элементы здесь)
  actions: {
    submitTopPrompt: null,
    submitChatMessage: null,
    submitPrompt: null,
    startRecordingButton: null,
    stopRecordingButton: null,
    saveFileButton: null, // Добавлено для кнопки сохранения файла в редакторе
    closeGestureModal: null, // Добавлено для кнопки закрытия модального окна жестов
    closePromptModal: null, // Добавлено для кнопки закрытия модального окна промптов
    closeFileEditorModal: null, // Добавлено для кнопки закрытия модального окна редактора файлов
  },
  
  // Другие элементы UI
  leftPanel: null,
  rightPanel: null,
  togglePanelsButton: null,
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
  
  // Получаем ссылки на элементы правой панели
  uiElements.versionTimeline = document.getElementById('versionTimeline');
  uiElements.chatHistory = document.getElementById('chatHistory');
  
  // Получаем ссылки на контейнеры
  uiElements.gridContainer = document.getElementById('grid-container');
  uiElements.gestureArea = document.getElementById('gesture-area');
  uiElements.containers.chatMessages = document.getElementById('chatMessages'); // Инициализируем контейнер чата
  
  // Получаем ссылки на модальные окна
  uiElements.modals.gestureModal = document.getElementById('gestureModal');
  uiElements.modals.promptModal = document.getElementById('promptModal');
  uiElements.modals.fileEditorModal = document.getElementById('fileEditorModal');
  
  // Получаем ссылки на элементы ввода
  uiElements.inputs.fileInput = document.getElementById('fileInput');
  uiElements.inputs.audioFileInput = document.getElementById('audioFileInput');
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
  uiElements.actions.saveFileButton = document.getElementById('saveFile');
  uiElements.actions.closeGestureModal = document.getElementById('closeGestureModal');
  uiElements.actions.closePromptModal = document.getElementById('closePromptModal');
  uiElements.actions.closeFileEditorModal = document.getElementById('closeFileEditorModal');

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
  // Assumes loadAudioButton acts as a trigger for the hidden chunkUploadInput
  if (uiElements.inputs.chunkUploadInput && uiElements.buttons.fileButton) {
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
      const setStatus = (message) => {
          console.log(message);
          // In a real application, replace alert with a proper UI notification
          // alert(message); 
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

  // --- Standard Button Event Listeners Helper ---
  // This helper adds a click listener to a button and logs a message, optionally running an async action.
  const addButtonListener = (button, action, logMessage) => {
    if (button) {
      button.addEventListener('click', async () => {
        if (typeof action === 'function') {
          await action();
        }
        if (logMessage) console.log(logMessage);
      });
    } else {
      // Log that the button was not found, helps in debugging missing HTML elements
      console.warn(`Button element for action "${logMessage || 'Unknown Action'}" not found.`);
    }
  };

  // Audio Controls (functionality pending, just logging clicks)
  addButtonListener(uiElements.buttons.playButton, null, "Play button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.pauseButton, null, "Pause button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.stopButton, null, "Stop button clicked - functionality pending.");

  // Mic Button (specific logic handled inline)
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
          const { analyserLeft, analyserRight, audioContext } = await state.microphoneManagerInstance.init();
          state.audio.audioContext = audioContext;
          state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };

          state.audioAnalyzerLeftInstance.analyserNode = analyserLeft;
          state.audioAnalyzerRightInstance.analyserNode = analyserRight;

          state.audio.activeSource = 'microphone';
          uiElements.buttons.micButton.classList.add('active');
          uiElements.buttons.micButton.title = "Выключить микрофон";
          console.log("Microphone started via UI button.");
        }
      } catch (error) {
        console.error("Error toggling microphone:", error);
        uiElements.buttons.micButton.textContent = "Mic Error";
        state.audio.activeSource = 'none';
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
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      console.log("Fullscreen button clicked.");
    });
  } else {
      console.warn("Fullscreen button element not found.");
  }

  // Other Feature Buttons
  addButtonListener(uiElements.buttons.xrButton, null, "XR button clicked - functionality pending.");
  // Corrected panel ID for My Gestures
  addButtonListener(uiElements.buttons.gestureRecordButton, () => {
      console.log("Gesture Record button clicked. Opening 'My Gestures' panel.");
      openContentPanel('myGesturesView'); // Corrected ID from index.html
  }, "Gesture Record button opens 'myGesturesView' panel.");

  // Corrected panel ID for My Holograms
  addButtonListener(uiElements.buttons.hologramListButton, () => {
      console.log("Hologram List button clicked. Opening 'My Holograms' panel.");
      openContentPanel('myHologramsView'); // Corrected ID from index.html
  }, "Hologram List button opens 'myHologramsView' panel.");

  addButtonListener(uiElements.buttons.scanButton, null, "Scan button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.bluetoothButton, null, "Bluetooth button clicked - functionality pending.");
  addButtonListener(uiElements.buttons.triaButton, null, "Tria (Activate Training) button clicked - functionality pending.");

  // Link Buttons
  addButtonListener(uiElements.buttons.telegramLinkButton, () => window.open('https://t.me/holograms_media', '_blank'), "Telegram link button clicked.");
  addButtonListener(uiElements.buttons.githubButton, () => window.open('https://github.com/Holograms-Media', '_blank'), "GitHub link button clicked.");

  // PWA Install Button
  addButtonListener(uiElements.buttons.installPwaButton, null, "Install PWA button clicked - PWA installation logic to be implemented.");

  // Chat Panel Button
  if (uiElements.buttons.chatButton) {
    uiElements.buttons.chatButton.addEventListener('click', () => {
        console.log("Chat Mode/Panel button clicked. Opening 'chatHistory' panel.");
        openContentPanel('chatHistory'); // This ID correctly matches the panel
    });
  } else {
      console.warn("Chat button (for toggling chat mode/panel) not found.");
  }

  // Action Buttons (Listeners expected to be set up in other modules like chat.js, fileEditor.js, gesture.js)
  // uiElements.actions.submitTopPrompt: Expected listener in promptManager.js or main.js
  // uiElements.actions.submitChatMessage: Expected listener in chat.js
  // uiElements.actions.submitPrompt: Expected listener in promptManager.js
  // uiElements.actions.startRecordingButton: Expected listener in gesture.js
  // uiElements.actions.stopRecordingButton: Expected listener in gesture.js
  // uiElements.actions.saveFileButton: Expected listener in fileEditor.js
  // uiElements.actions.closeGestureModal: Expected listener in gesture.js (or modal logic)
  // uiElements.actions.closePromptModal: Expected listener in promptManager.js (or modal logic)
  // uiElements.actions.closeFileEditorModal: Expected listener in fileEditor.js (or modal logic)
}

/**
 * Переключает режим чата (видимость панели чата)
 * NOTE: This function may be redundant or conflict if panelManager controls visibility.
 * Consider if this should still be used or if panelManager.openContentPanel('chatHistory') is sufficient.
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
