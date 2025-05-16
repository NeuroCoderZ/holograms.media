// frontend/js/ui/uiManager.js - Модуль для управления UI элементами

// Импортируем необходимые зависимости
import { state } from '../core/init.js';

// Объект для хранения ссылок на DOM-элементы
export const uiElements = {
  // Кнопки левой панели
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
  
  // Элементы правой панели
  versionTimeline: null,
  chatHistory: null,
  
  // Контейнеры
  gridContainer: null,
  gestureArea: null,
  
  // Модальные окна
  gestureModal: null,
  promptModal: null,
  
  // Элементы ввода
  fileInput: null,
  topPromptInput: null,
  chatInput: null,
  promptText: null,
  modelSelect: null,
  
  // Кнопки действий
  submitTopPrompt: null,
  submitChatMessage: null,
  submitPrompt: null,
  startRecordingButton: null,
  stopRecordingButton: null,
  
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
  uiElements.fileButton = document.getElementById('fileButton');
  uiElements.playButton = document.getElementById('playButton');
  uiElements.pauseButton = document.getElementById('pauseButton');
  uiElements.stopButton = document.getElementById('stopButton');
  uiElements.micButton = document.getElementById('micButton');
  uiElements.fullscreenButton = document.getElementById('fullscreenButton');
  uiElements.xrButton = document.getElementById('xrButton');
  uiElements.gestureRecordButton = document.getElementById('gestureRecordButton');
  uiElements.scanButton = document.getElementById('scanButton');
  uiElements.bluetoothButton = document.getElementById('bluetoothButton');
  uiElements.telegramLinkButton = document.getElementById('telegramLinkButton');
  uiElements.githubButton = document.getElementById('githubButton');
  uiElements.triaButton = document.getElementById('triaButton');
  uiElements.chatButton = document.getElementById('chatButton');
  
  // Получаем ссылки на элементы правой панели
  uiElements.versionTimeline = document.getElementById('versionTimeline');
  uiElements.chatHistory = document.getElementById('chatMessages');
  
  // Получаем ссылки на контейнеры
  uiElements.gridContainer = document.getElementById('grid-container');
  uiElements.gestureArea = document.getElementById('gesture-area');
  
  // Получаем ссылки на модальные окна
  uiElements.gestureModal = document.getElementById('gestureModal');
  uiElements.promptModal = document.getElementById('promptModal');
  
  // Получаем ссылки на элементы ввода
  uiElements.fileInput = document.getElementById('fileInput');
  uiElements.topPromptInput = document.getElementById('topPromptInput');
  uiElements.chatInput = document.getElementById('chatInput');
  uiElements.promptText = document.getElementById('promptText');
  uiElements.modelSelect = document.getElementById('modelSelect');
  
  // Получаем ссылки на кнопки действий
  uiElements.submitTopPrompt = document.getElementById('submitTopPrompt');
  uiElements.submitChatMessage = document.getElementById('submitChatMessage');
  uiElements.submitPrompt = document.getElementById('submitPrompt');
  uiElements.startRecordingButton = document.getElementById('startRecordingButton');
  uiElements.stopRecordingButton = document.getElementById('stopRecordingButton');
  
  // Получаем ссылки на панели
  uiElements.leftPanel = document.querySelector('.panel.left-panel');
  uiElements.rightPanel = document.querySelector('.panel.right-panel');
  uiElements.togglePanelsButton = document.getElementById('togglePanelsButton');
  
  // Инициализируем состояние панелей
  initializePanelState();
  
  // Добавляем обработчик для кнопки переключения панелей
  if (uiElements.togglePanelsButton) {
    uiElements.togglePanelsButton.addEventListener('click', togglePanels);
  }
  
  console.log('Основной UI инициализирован');
}

/**
 * Переключает режим чата
 */
export function toggleChatMode() {
  // Получаем элементы чата
  const chatHistory = document.getElementById('chatHistory');
  const chatInputBar = document.getElementById('chatInputBar');
  
  if (!chatHistory || !chatInputBar) {
    console.error('Элементы чата не найдены');
    return;
  }
  
  // Переключаем видимость элементов чата
  const isChatVisible = chatHistory.style.display !== 'none';
  
  if (isChatVisible) {
    // Скрываем чат
    chatHistory.style.display = 'none';
    chatInputBar.style.display = 'none';
    
    // Обновляем состояние
    if (uiElements.chatButton) {
      uiElements.chatButton.classList.remove('active');
    }
    
    // Обновляем глобальное состояние
    if (window.state) {
      window.state.isChatMode = false;
    }
    
    console.log('Режим чата деактивирован');
  } else {
    // Показываем чат
    chatHistory.style.display = 'block';
    chatInputBar.style.display = 'flex';
    
    // Обновляем состояние
    if (uiElements.chatButton) {
      uiElements.chatButton.classList.add('active');
    }
    
    // Обновляем глобальное состояние
    if (window.state) {
      window.state.isChatMode = true;
    }
    
    console.log('Режим чата активирован');
  }
  
  // Вызываем ресайз для обновления размеров
  window.dispatchEvent(new Event('resize'));
}