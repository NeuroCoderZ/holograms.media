/**
 * Модуль управления правой панелью интерфейса.
 * Отвечает за переключение между режимами Промпт (Таймлайн) и Чат.
 * По умолчанию инициализируется в режиме Чат.
 */
import eventBus from '../core/eventBus.js'; // Import EventBus

// --- Переменные модуля ---
const elements = {
  promptModeButton: null,
  modelSelect: null,
  versionTimeline: null,
  chatHistory: null,
  promptBar: null,
  chatInputBar: null,
  topPromptInput: null,
  chatInput: null,
  loadingIndicator: null,
  promptIconOriginal: null,
  chatIconSvg: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v520q0 33-23.5 56.5T800-200H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg>`
};

// --- Внутренние функции модуля ---

/**
 * Обновляет видимость UI элементов в зависимости от режима.
 * @param {boolean} isChatMode - true, если включен режим чата.
 */
function updateUIVisibility(isChatMode) {
  // Скрываем ВСЕ возможные секции перед показом нужных
  const allSections = document.querySelectorAll('.right-panel-view, .panel-section');
  allSections.forEach(el => el.style.display = 'none');

  // Элементы режима "Промпт" (включая таймлайн)
  const promptModeElements = [elements.promptBar, elements.versionTimeline];
  // Элементы режима "Чат"
  const chatModeElements = [elements.chatInputBar, elements.chatHistory];

  if (isChatMode) {
    chatModeElements.forEach(el => { if (el) el.style.display = 'flex'; });
  } else {
    promptModeElements.forEach(el => { if (el) el.style.display = 'flex'; });
  }

  // Селектор моделей виден только в режиме "Промпт"
  if (elements.modelSelect) {
    elements.modelSelect.style.display = isChatMode ? 'none' : 'block';
  }

  // Скрываем индикатор загрузки при переключении
  if (elements.loadingIndicator) {
    elements.loadingIndicator.style.display = 'none';
  }

  // Фокус на поле ввода
  if (isChatMode && elements.chatInput) {
    setTimeout(() => elements.chatInput.focus(), 100);
  } else if (!isChatMode && elements.topPromptInput) {
    setTimeout(() => elements.topPromptInput.focus(), 100);
  }

  // Обновляем заголовок (Strict Headers)
  const header = document.getElementById('rightPanelHeader');
  if (header) {
    header.style.display = 'block';
    header.style.color = '#888888';
    header.textContent = isChatMode ? 'CHAT' : 'VERSIONS'; // RE-BRAND: CHAT / VERSIONS
  }

  // Обновляем иконку кнопки #promptModeButton
  if (elements.promptModeButton) {
    if (isChatMode) {
      // В режиме чата кнопка показывает "Промпт" (оригинальная иконка)
      if (elements.promptIconOriginal) {
        elements.promptModeButton.innerHTML = elements.promptIconOriginal;
      }
    } else {
      // В режиме промпта кнопка показывает "Чат" (новая иконка)
      elements.promptModeButton.innerHTML = elements.chatIconSvg;
    }
  }
}

/**
 * Обработчик для кнопки переключения режимов.
 */
function toggleMode() {
  if (!elements.promptModeButton) return;

  // Переключаем класс 'active' на кнопке. Режим "Промпт" - когда кнопка активна.
  const isPromptMode = elements.promptModeButton.classList.toggle('active');
  // Режим чата - это когда режим промпта НЕ активен.
  const isChatMode = !isPromptMode;

  updateUIVisibility(isChatMode);

  if (isPromptMode) {
    eventBus.emit('versions:refresh');
  }

  console.log(`Режим правой панели переключен на: ${isPromptMode ? 'Промпт' : 'Чат'}`);
}


// --- Экспортируемые функции ---

/**
 * Инициализация правой панели.
 */
export function initializeRightPanel(appState) {
  console.log('Инициализация управления правой панелью...');

  // Находим все необходимые элементы один раз
  elements.promptModeButton = document.getElementById('promptModeButton');
  elements.modelSelect = document.getElementById('modelSelect');
  elements.versionTimeline = document.getElementById('versionTimeline');
  elements.chatHistory = document.getElementById('chatHistory');
  elements.promptBar = document.getElementById('promptBar');
  elements.chatInputBar = document.getElementById('chatInputBar');
  elements.topPromptInput = document.getElementById('topPromptInput');
  elements.chatInput = document.getElementById('chatInput');
  elements.loadingIndicator = document.getElementById('loadingIndicator');

  // Сохраняем оригинальную иконку кнопки
  if (elements.promptModeButton && !elements.promptIconOriginal) {
    elements.promptIconOriginal = elements.promptModeButton.innerHTML;
  }

  // Навешиваем обработчик
  elements.promptModeButton.addEventListener('click', toggleMode);

  // Устанавливаем режим ЧАТА по умолчанию при загрузке
  // Кнопка "Промпт" неактивна, значит включен режим чата
  updateUIVisibility(true);
  console.log('Режим правой панели по умолчанию: Чат.');

  // Подписываемся на события переключения
  eventBus.on('ui:switchToChat', () => {
    console.log('RightPanelManager: Получена команда переключения в чат через EventBus');
    switchToChatMode();
  });
}

/**
 * Возвращает текущий активный режим панели.
 * @returns {'chat' | 'prompt'}
 */
export function getCurrentMode() {
  if (!elements.promptModeButton) return 'unknown';
  return elements.promptModeButton.classList.contains('active') ? 'prompt' : 'chat';
}
/**
 * Переключает правую панель в режим чата.
 */
export function switchToChatMode() {
  if (elements.promptModeButton) {
    elements.promptModeButton.classList.remove("active");
  }
  updateUIVisibility(true);
  console.log("Режим правой панели переключен на: Чат");
}

