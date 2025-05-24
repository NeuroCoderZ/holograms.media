// frontend/js/core/ui.js - Управление пользовательским интерфейсом

import { state } from './init.js';

// Объекты UI
export const ui = {
  // Основные панели
  leftPanel: null,
  rightPanel: null,
  togglePanelsButton: null,
  
  // Кнопки управления
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
    chatButton: null
  },
  
  // Контейнеры и области
  containers: {
    gridContainer: null,
    gestureArea: null,
    chatMessages: null,
    versionFrames: null
  },
  
  // Модальные окна
  modals: {
    gestureModal: null,
    promptModal: null
  },
  
  // Элементы ввода
  inputs: {
    fileInput: null,
    topPromptInput: null,
    chatInput: null,
    promptText: null,
    modelSelect: null
  },
  
  // Кнопки действий
  actions: {
    submitTopPrompt: null,
    submitChatMessage: null,
    submitPrompt: null,
    startRecordingButton: null,
    stopRecordingButton: null
  }
};

// Инициализация UI
export function setupUI() {
  console.log('Инициализация пользовательского интерфейса...');
  
  // Получаем ссылки на основные панели
  ui.leftPanel = document.querySelector('.panel.left-panel');
  ui.rightPanel = document.querySelector('.panel.right-panel');
  ui.togglePanelsButton = document.getElementById('togglePanelsButton');
  
  // Инициализируем все кнопки
  initButtons();
  
  // Инициализируем контейнеры
  initContainers();
  
  // Инициализируем модальные окна
  initModals();
  
  // Инициализируем поля ввода
  initInputs();
  
  // Инициализируем кнопки действий
  initActions();
  
  // Состояние панелей инициализируется через panelManager.js
  
  console.log('Пользовательский интерфейс инициализирован.');
}

// Инициализация кнопок
function initButtons() {
  ui.buttons.fileButton = document.getElementById('fileButton');
  ui.buttons.playButton = document.getElementById('playButton');
  ui.buttons.pauseButton = document.getElementById('pauseButton');
  ui.buttons.stopButton = document.getElementById('stopButton');
  ui.buttons.micButton = document.getElementById('micButton');
  ui.buttons.fullscreenButton = document.getElementById('fullscreenButton');
  ui.buttons.gestureRecordButton = document.getElementById('gestureRecordButton');
  ui.buttons.xrButton = document.getElementById('xrButton');
  ui.buttons.gestureRecordButton = document.getElementById('gestureRecordButton');
  ui.buttons.scanButton = document.getElementById('scanButton');
  ui.buttons.bluetoothButton = document.getElementById('bluetoothButton');
  ui.buttons.telegramLinkButton = document.getElementById('telegramLinkButton');
  ui.buttons.githubButton = document.getElementById('githubButton');
  ui.buttons.triaButton = document.getElementById('triaButton');
  ui.buttons.chatButton = document.getElementById('chatButton');
}

// Инициализация контейнеров
function initContainers() {
  ui.containers.gridContainer = document.getElementById('grid-container');
  ui.containers.gestureArea = document.getElementById('gesture-area');
  ui.containers.chatMessages = document.getElementById('chatMessages');
  ui.containers.versionFrames = document.getElementById('versionFrames');
  
  // Добавляем подсказку для области жестов
  if (ui.containers.gestureArea) {
    ui.containers.gestureArea.title = 'Кликните для записи жеста';
  }
}

/**
 * Переключает видимость области жестов
 * @param {boolean} [show] - Если true, показывает область жестов, если false - скрывает.
 *                          Если не указано, переключает текущее состояние.
 */
export function toggleGestureArea(show) {
  if (!ui.containers.gestureArea) {
    console.error('Ошибка: Элемент #gesture-area не найден в DOM');
    return;
  }
  
  // Если параметр show не указан, переключаем текущее состояние
  if (show === undefined) {
    ui.containers.gestureArea.classList.toggle('hands-detected');
  } else {
    // Иначе устанавливаем состояние в соответствии с параметром
    if (show) {
      ui.containers.gestureArea.classList.add('hands-detected');
    } else {
      ui.containers.gestureArea.classList.remove('hands-detected');
    }
  }
  
  console.log(`Область жестов ${ui.containers.gestureArea.classList.contains('hands-detected') ? 'активирована' : 'деактивирована'}`);
}

// Инициализация модальных окон
function initModals() {
  ui.modals.gestureModal = document.getElementById('gestureModal');
  ui.modals.promptModal = document.getElementById('promptModal');
}

// Инициализация полей ввода
function initInputs() {
  ui.inputs.fileInput = document.getElementById('fileInput');
  ui.inputs.topPromptInput = document.getElementById('topPromptInput');
  ui.inputs.chatInput = document.getElementById('chatInput');
  ui.inputs.promptText = document.getElementById('promptText');
  ui.inputs.modelSelect = document.getElementById('modelSelect');
}

// Инициализация кнопок действий
function initActions() {
  ui.actions.submitTopPrompt = document.getElementById('submitTopPrompt');
  ui.actions.submitChatMessage = document.getElementById('submitChatMessage');
  ui.actions.submitPrompt = document.getElementById('submitPrompt');
  ui.actions.startRecordingButton = document.getElementById('startRecordingButton');
  ui.actions.stopRecordingButton = document.getElementById('stopRecordingButton');
}

// Функции initializePanelState и togglePanels были перемещены в frontend/js/ui/panelManager.js

// Переключение между режимами чата и ввода промпта
export function toggleChatMode() {
  const chatButton = ui.buttons.chatButton;
  if (!chatButton) return;
  
  const isChatMode = chatButton.classList.toggle('active');
  
  // Получаем элементы разных режимов
  const defaultModeElements = document.querySelectorAll('.default-mode');
  const chatModeElements = document.querySelectorAll('.chat-mode');
  
  // Переключаем видимость элементов
  defaultModeElements.forEach(el => {
    el.style.display = isChatMode ? 'none' : 'block';
  });
  
  chatModeElements.forEach(el => {
    el.style.display = isChatMode ? 'block' : 'none';
  });
  
  // Скрываем индикаторы загрузки при переключении режимов
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
  
  // Автофокус в режиме чата
  if (isChatMode) {
    const chatInput = ui.inputs.chatInput;
    if (chatInput) {
      setTimeout(() => {
        chatInput.focus();
      }, 100);
    }
  } else {
    const promptInput = ui.inputs.topPromptInput;
    if (promptInput) {
      setTimeout(() => {
        promptInput.focus();
      }, 100);
    }
  }
  
  console.log(`Режим чата ${isChatMode ? 'включен' : 'выключен'}`);
}