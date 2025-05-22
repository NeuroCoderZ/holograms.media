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
export function switchToTimelineMode() {
  if (!elements.chatButton) {
      console.error("Невозможно переключить режим: кнопка чата не найдена.");
      return; // Выходим, если кнопка не найдена
  }

  // Переключаем класс active у кнопки чата
  const isChatMode = elements.chatButton.classList.toggle('active');

  // Получаем элементы разных режимов (лучше искать их здесь, а не хранить глобально)
  const defaultModeElements = document.querySelectorAll('.default-mode');
  const chatModeElements = document.querySelectorAll('.chat-mode');

  // Переключаем видимость элементов
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
export function initializeRightPanel() {
  console.log('Инициализация управления правой панелью...');

  // Получаем ссылки на DOM-элементы и сохраняем их в объекте elements
  elements.chatButton = document.getElementById('chatButton');
  elements.submitTopPrompt = document.getElementById('submitTopPrompt');
  elements.submitChatMessage = document.getElementById('submitChatMessage');
  elements.versionTimeline = document.getElementById('versionTimeline');
  elements.chatHistory = document.getElementById('chatHistory');
  elements.promptBar = document.getElementById('promptBar');
  elements.chatInputBar = document.getElementById('chatInputBar');
  elements.topPromptInput = document.getElementById('topPromptInput');
  elements.chatInput = document.getElementById('chatInput');
  elements.loadingIndicator = document.getElementById('loadingIndicator');

  // Проверяем, что ключевые элементы найдены
  if (!elements.chatButton || !elements.versionTimeline || !elements.chatHistory || !elements.promptBar || !elements.chatInputBar) {
    console.error('Не удалось найти все необходимые элементы для управления правой панелью.');
    return false; // Возвращаем false при ошибке инициализации
  }

  // Устанавливаем обработчик для кнопки чата
  elements.chatButton.addEventListener('click', toggleModeInternal); // Назначаем внутреннюю функцию

  console.log('Инициализация управления правой панелью завершена.');
  return true; // Возвращаем true при успехе
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
 * Программно переключает панель в режим таймлайна.
 */
export function switchToTimelineMode() {
  if (elements.chatButton && elements.chatButton.classList.contains('active')) {
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