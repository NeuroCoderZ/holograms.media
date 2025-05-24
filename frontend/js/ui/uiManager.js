// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { loadPanelsHiddenState, savePanelsHiddenState } from '../core/appStatePersistence.js'; // Импорт функций для сохранения/загрузки состояния
import { state } from '../core/init.js'; // Импорт глобального состояния

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
}

/**
 * Переключает режим чата (видимость панели чата)
 * NOTE: This is a simplified version that only toggles the visibility of the chat history container.
 * For comprehensive mode switching (including input areas, button states, focus management),
 * prefer using `toggleChatMode` from `frontend/js/core/ui.js`.
 */
export function toggleChatMode() {
  if (!uiElements.chatHistory) {
    console.error('Контейнер истории чата не инициализирован для toggleChatMode (uiManager)');
    return;
  }

  const isChatHidden = uiElements.chatHistory.classList.toggle('hidden');
  console.log(`Панель чата (uiManager) ${isChatHidden ? 'скрыта' : 'показана'}`);

  // Вызываем ресайз для обновления размеров, если это влияет на макет
  window.dispatchEvent(new Event('resize'));
}

// Экспортируем функции, которые могут понадобиться другим модулям
export { initializePanelState, logLayoutState };

// Удаляем неиспользуемый экспорт getPanelWidths (сделали локальной или удалим если не нужна)

// TODO: Добавить инициализацию других UI элементов по мере необходимости
// TODO: Рассмотреть возможность использования более надежного способа получения элементов, например, через классы или атрибуты данных, если ID не уникальны или могут меняться.