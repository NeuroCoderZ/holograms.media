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
  
  // Инициализируем состояние панелей
  initializePanelState();
  
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

// Функция для инициализации состояния панелей
export function initializePanelState() {
  if (!ui.leftPanel || !ui.rightPanel || !ui.togglePanelsButton) {
    console.error('Required elements not found for initializePanelState');
    return;
  }

  // Получаем сохраненное состояние
  const savedState = localStorage.getItem('panelsHidden');
  const shouldBeHidden = savedState === 'true';

  // Применяем классы
  ui.leftPanel.classList.toggle('hidden', shouldBeHidden);
  ui.rightPanel.classList.toggle('hidden', shouldBeHidden);
  ui.togglePanelsButton.classList.toggle('show-mode', shouldBeHidden);

  // Вызываем ресайз после применения классов
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 50);
}

// Переключение панелей
export function togglePanels() {
  if (!ui.leftPanel || !ui.rightPanel || !ui.togglePanelsButton) {
    console.error('Required elements not found for togglePanels');
    return;
  }
  
  const willBeHidden = !ui.leftPanel.classList.contains('hidden');
  
  // Перемещаем кнопку в body, если она еще не там
  if (ui.togglePanelsButton.parentNode !== document.body) {
    document.body.appendChild(ui.togglePanelsButton);
  }
  
  ui.leftPanel.classList.toggle('hidden', willBeHidden);
  ui.rightPanel.classList.toggle('hidden', willBeHidden);
  ui.togglePanelsButton.classList.toggle('show-mode', willBeHidden);
  localStorage.setItem('panelsHidden', willBeHidden.toString());
  
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 50);
}

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

// Обновление макета голограммы
export function updateHologramLayout(handsVisible) {
  // Проверяем наличие необходимых элементов
  // Расширенная проверка на существование всех необходимых компонентов
  if (!ui.containers.gridContainer) {
    console.warn('[Events/resize] Skipping updateHologramLayout: gridContainer is not available.');
    return;
  }
  
  if (!ui.containers.gestureArea) {
    console.warn('[Events/resize] Skipping updateHologramLayout: gestureArea is not available.');
    return;
  }
  
  // Проверяем наличие hologramPivot в state или в глобальном объекте window
  if (!state) {
    console.warn('[Events/resize] Skipping updateHologramLayout: state is not available.');
    return;
  }
  
  // Если hologramPivot не инициализирован в state, но доступен глобально, используем его
  if (!state.hologramPivot && window.hologramPivot) {
    state.hologramPivot = window.hologramPivot;
    console.log('hologramPivot инициализирован из глобального объекта в updateHologramLayout');
  }
  
  if (!state.hologramPivot) {
    console.warn('[Events/resize] Skipping updateHologramLayout: hologramPivot is not available.');
    return;
  }
  
  // Проверяем наличие scene, camera и renderer
  if (!state.scene) {
    // Если scene не инициализирована в state, но доступна глобально, используем её
    if (window.scene) {
      state.scene = window.scene;
      console.log('scene инициализирована из глобального объекта в updateHologramLayout');
    } else {
      console.warn('[Events/resize] Skipping updateHologramLayout: scene is not available.');
      return;
    }
  }
  
  if (!state.camera) {
    // Если camera не инициализирована в state, но доступна глобально, используем её
    if (window.camera) {
      state.camera = window.camera;
      console.log('camera инициализирована из глобального объекта в updateHologramLayout');
    } else {
      console.warn('[Events/resize] Skipping updateHologramLayout: camera is not available.');
      return;
    }
  }
  
  if (!state.renderer) {
    // Если renderer не инициализирован в state, но доступен глобально, используем его
    if (window.renderer) {
      state.renderer = window.renderer;
      console.log('renderer инициализирован из глобального объекта в updateHologramLayout');
    } else {
      console.warn('[Events/resize] Skipping updateHologramLayout: renderer is not available.');
      return;
    }
  }

  // Получаем размеры и рассчитываем целевые значения
  const windowHeight = window.innerHeight;
  const topMargin = windowHeight * 0.05;
  const availableWidth = window.innerWidth - getPanelWidths();
  const availableHeight = windowHeight - (handsVisible ? windowHeight * 0.25 : 4);
  
  const targetScale = handsVisible ? 0.8 : calculateInitialScale(availableWidth, availableHeight);
  const targetPositionY = handsVisible ? topMargin : 0;

  // Анимируем масштаб
  if (window.TWEEN) {
    new window.TWEEN.Tween(state.hologramPivot.scale)
      .to({ x: targetScale, y: targetScale, z: targetScale }, 500)
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .start();

    // Анимируем позицию
    new window.TWEEN.Tween(state.hologramPivot.position)
      .to({ y: targetPositionY }, 500)
      .easing(window.TWEEN.Easing.Quadratic.InOut)
      .onComplete(() => {
        // Обновляем камеру после завершения анимации
        if (state.camera) state.camera.updateProjectionMatrix();
      })
      .start();
  } else {
    // Если TWEEN не доступен, применяем изменения немедленно
    state.hologramPivot.scale.set(targetScale, targetScale, targetScale);
    state.hologramPivot.position.y = targetPositionY;
    if (state.camera) state.camera.updateProjectionMatrix();
  }
}

// Вспомогательные функции
function getPanelWidths() {
  return (ui.leftPanel?.offsetWidth || 0) + (ui.rightPanel?.offsetWidth || 0);
}

function calculateInitialScale(containerWidth, availableHeightForHologram) {
  const { WIDTH, HEIGHT } = state.config?.GRID || { WIDTH: 130, HEIGHT: 260 };
  
  const hologramWidth = WIDTH * 2;
  const hologramHeight = HEIGHT;
  
  let widthScale = (containerWidth * 0.98) / hologramWidth;
  let heightScale = availableHeightForHologram / hologramHeight;
  
  let scale = Math.min(widthScale, heightScale);
  scale = Math.max(scale, 0.1); // Минимальный масштаб
  
  return scale;
}