// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { loadPanelsHiddenState, savePanelsHiddenState } from '../core/appStatePersistence.js'; // Импорт функций для сохранения/загрузки состояния
import { state } from '../core/init.js'; // Импорт глобального состояния
import { auth } from '../core/firebaseInit.js'; // Firebase Auth
import { uploadFileToFirebaseStorage } from '../services/firebaseStorageService.js'; // Firebase Storage Service

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
  uiElements.buttons.triaButton = document.getElementById('triaButton');
  uiElements.buttons.chatButton = document.getElementById('chatButton');
  
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
  if (uiElements.inputs.chunkUploadInput) {
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
    console.warn("chunkUploadInput element not found in the DOM. Upload functionality will not be available.");
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