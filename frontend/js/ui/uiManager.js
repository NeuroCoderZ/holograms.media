// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { state } from '../core/init.js';

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
    fileInput: null,
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
export function initializePanelState() {
  // Проверяем наличие панелей
  if (!uiElements.leftPanel || !uiElements.rightPanel || !uiElements.togglePanelsButton) {
    console.error('Не удалось найти панели интерфейса для initializePanelState');
    return;
  }
  
  // Получаем сохраненное состояние
  const savedState = localStorage.getItem('panelsHidden');
  const shouldBeHidden = savedState === 'true';

  // Применяем классы
  uiElements.leftPanel.classList.toggle('hidden', shouldBeHidden);
  uiElements.rightPanel.classList.toggle('hidden', shouldBeHidden);
  uiElements.togglePanelsButton.classList.toggle('show-mode', shouldBeHidden);

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
  
  // Сохраняем состояние в localStorage
  const isPanelsHidden = uiElements.leftPanel.classList.contains('hidden');
  localStorage.setItem('panelsHidden', isPanelsHidden);
  
  // Обновляем состояние в глобальной переменной state
  state.isPanelsHidden = isPanelsHidden;
  
  // Вызываем ресайз для обновления размеров
  window.dispatchEvent(new Event('resize'));
  
  console.log(`Панели ${isPanelsHidden ? 'скрыты' : 'показаны'}`);
}

/**
 * Возвращает суммарную ширину боковых панелей
 */
export function getPanelWidths() {
  const leftPanel = document.querySelector('.panel.left-panel');
  const rightPanel = document.querySelector('.panel.right-panel');
  return (leftPanel?.offsetWidth || 0) + (rightPanel?.offsetWidth || 0);
}

/**
 * Добавляет отладочные классы к элементам
 */
export function addDebugClasses() {
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
 * Логирует состояние макета
 */
export function logLayoutState() {
  // Логи закомментированы, как требуется в задании
  /*
  // Логируем состояние голограммы
  console.log('[Layout] Hologram state:', {
    position: hologramPivot.position.toArray(),
    scale: hologramPivot.scale.toArray(),
    rotation: hologramPivot.rotation.toArray()
  });

  // Логируем размеры панели
  const leftPanel = document.querySelector('.panel.left-panel');
  if (leftPanel) {
    console.log('[Layout] Left panel dimensions:', {
      width: leftPanel.offsetWidth,
      buttonSize: getComputedStyle(document.documentElement).getPropertyValue('--button-size')
    });
  }

  // Логируем стили меток
  const versionLabel = document.querySelector('.version-label');
  if (versionLabel) {
    const styles = getComputedStyle(versionLabel);
    console.log('[Layout] Version label styles:', {
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      transform: styles.transform
    });
  }
  */
}

/**
 * Инициализирует основной UI приложения
 * Находит DOM-элементы, устанавливает начальное состояние и назначает обработчики событий
 */
export function initializeMainUI() {
  console.log('Инициализация основного UI...');
  
  // Получаем ссылки на DOM-элементы кнопок левой панели
  uiElements.buttons.fileButton = document.getElementById('fileButton');
  uiElements.buttons.playButton = document.getElementById('playButton');
  uiElements.buttons.pauseButton = document.getElementById('pauseButton');
  uiElements.buttons.stopButton = document.getElementById('stopButton');
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
  uiElements.containers.chatMessages = document.getElementById('chatMessagesContainer'); // Инициализируем контейнер чата
  
  // Получаем ссылки на модальные окна
  uiElements.modals.gestureModal = document.getElementById('gestureModal');
  uiElements.modals.promptModal = document.getElementById('promptModal');
  
  // Получаем ссылки на элементы ввода
  uiElements.inputs.fileInput = document.getElementById('fileInput');
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
export { initializePanelState, togglePanels, getPanelWidths, addDebugClasses, logLayoutState, toggleChatMode };

// TODO: Добавить инициализацию других UI элементов по мере необходимости
// TODO: Рассмотреть возможность использования более надежного способа получения элементов, например, через классы или атрибуты данных, если ID не уникальны или могут меняться.