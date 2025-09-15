/**
 * Модуль управления правой панелью интерфейса.
 * Отвечает за переключение между режимами Таймлайн и Чат.
 */

// --- Переменные модуля ---
// Объект для хранения ссылок на DOM-элементы.
// Будет заполнен в initializeRightPanel.
const elements = {
  chatButton: null,
  submitTopPrompt: null,
  submitChatMessage: null,
  versionTimeline: null,
  chatHistory: null,
  promptBar: null,
  chatInputBar: null,
  topPromptInput: null,
  chatInput: null,
  loadingIndicator: null
};
// --- Внутренние функции модуля ---

/**
 * Внутренняя функция для переключения между режимами Таймлайн и Чат.
 * Вызывается обработчиком событий или другими функциями модуля.
 */
export function toggleModeInternal() {
  if (!elements.chatButton) {
      console.error("Невозможно переключить режим: кнопка чата не найдена.");
      return; // Выходим, если кнопка не найдена
  }

  // Переключаем класс active у кнопки чата
  const isChatMode = elements.chatButton.classList.toggle('active');  // Получаем элементы разных режимов (лучше искать их здесь, а не хранить глобально)
  const defaultModeElements = document.querySelectorAll('.default-mode');
  const chatModeElements = document.querySelectorAll('.chat-mode');  // Переключаем видимость элементов
  defaultModeElements.forEach(el => {
    // Используем 'flex' для контейнеров, 'block' для кнопок/полей по умолчанию
    const displayStyle = (el.id === 'promptBar' || el.id === 'versionTimeline') ? 'flex' : 'block';
    el.style.display = isChatMode ? 'none' : displayStyle;
  });

  chatModeElements.forEach(el => {
    const displayStyle = (el.id === 'chatInputBar' || el.id === 'chatHistory') ? 'flex' : 'block';
    el.style.display = isChatMode ? displayStyle : 'none';
  });

  // Скрываем индикатор загрузки при переключении режимов
  if (elements.loadingIndicator) {
    elements.loadingIndicator.style.display = 'none';
  }

  // Автофокус на соответствующее поле ввода
  if (isChatMode) {
    if (elements.chatInput) {
      setTimeout(() => {
        elements.chatInput.focus();
      }, 100);
    }
  } else {
    if (elements.topPromptInput) {
      setTimeout(() => {
        elements.topPromptInput.focus();
      }, 100);
    }
  }

  console.log(`Режим правой панели переключен на: ${isChatMode ? 'Чат' : 'Таймлайн'}`);
}

// --- Экспортируемые функции ---

/**
 * Инициализация правой панели.
 * Находит DOM-элементы и назначает обработчик на кнопку чата.
 * Должна вызываться один раз при загрузке приложения.
 */
// Import state if you prefer direct import, otherwise rely on it being passed.
// import { state } from '../core/init.js'; // Option 1: direct import

export function initializeRightPanel(appState) { // Option 2: passed as argument (preferred for consistency with uiManager)
  console.log('Инициализация управления правой панелью...');

  if (!appState || !appState.uiElements) {
    console.error('RightPanelManager: State or uiElements not provided for initialization.');
    return false;
  }

  // Get references from appState.uiElements
  elements.chatButton = appState.uiElements.buttons.chatButton; // Corrected path based on uiManager
  elements.submitTopPrompt = appState.uiElements.actions.submitTopPrompt; // Corrected path
  elements.submitChatMessage = appState.uiElements.actions.submitChatMessage; // Corrected path
  elements.versionTimeline = appState.uiElements.versionTimeline;
  elements.chatHistory = appState.uiElements.chatHistory;
  elements.topPromptInput = appState.uiElements.inputs.topPromptInput;
  elements.chatInput = appState.uiElements.inputs.chatInput;

  // Assignments from appState.uiElements for elements previously fetched by getElementById
  elements.promptBar = appState.uiElements.containers.promptBar;
  elements.chatInputBar = appState.uiElements.containers.chatInputBar;
  elements.loadingIndicator = appState.uiElements.indicators.loadingIndicator;

  // Check if key elements were found via state.uiElements
  if (!elements.chatButton || !elements.versionTimeline || !elements.chatHistory) {
    console.error('Не удалось найти все необходимые элементы (via state.uiElements) для управления правой панелью.');
    // Log what was found or not
    if (!elements.chatButton) console.error("RightPanelManager: chatButton not found in appState.uiElements.buttons");
    if (!elements.versionTimeline) console.error("RightPanelManager: versionTimeline not found in appState.uiElements");
    if (!elements.chatHistory) console.error("RightPanelManager: chatHistory not found in appState.uiElements");
    return false;
  }

  // Warnings for the elements now expected from appState.uiElements
  if (!elements.promptBar) {
    console.warn("RightPanelManager: promptBar not found in appState.uiElements.containers.");
  }
  if (!elements.chatInputBar) {
    console.warn("RightPanelManager: chatInputBar not found in appState.uiElements.containers.");
  }
  if (!elements.loadingIndicator) {
    console.warn("RightPanelManager: loadingIndicator not found in appState.uiElements.indicators.");
  }

  // Устанавливаем обработчик для кнопки чата (if found)
  if (elements.chatButton) {
    elements.chatButton.addEventListener('click', toggleModeInternal);
  } else {
    // This case is already handled by the check above, but for clarity:
    console.error("RightPanelManager: chatButton not found, cannot assign listener for mode toggle.");
  }

  console.log('Инициализация управления правой панелью завершена (using state.uiElements where possible).');
  return true;
}

/**
 * Программно переключает панель в режим чата.
 */
export function switchToChatMode() {
  if (elements.chatButton && !elements.chatButton.classList.contains('active')) {
    toggleModeInternal(); // Используем внутреннюю функцию
  }
}

/**
 * Возвращает текущий активный режим панели.
 * @returns {'chat' | 'timeline' | 'unknown'} Текущий режим ('chat', 'timeline') или 'unknown', если панель не инициализирована.
 */
export function getCurrentMode() {
  if (!elements.chatButton) {
      console.warn("Попытка получить режим до инициализации панели.");
      return 'unknown';
  }
  return elements.chatButton.classList.contains('active') ? 'chat' : 'timeline';
}