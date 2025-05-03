/**
 * Модуль для управления отображением сообщений в истории чата
 */

// Проверка поддержки Web Speech Synthesis API
const synth = window.speechSynthesis;
if (!synth) {
  console.error('Web Speech Synthesis API не поддерживается');
}

// Ссылка на DOM-элемент контейнера сообщений
let chatMessagesContainer = null;

/**
 * Инициализирует отображение чата, находит и сохраняет ссылку на контейнер сообщений
 * @returns {boolean} Успешность инициализации
 */
export function initializeChatDisplay() {
  chatMessagesContainer = document.getElementById('chatMessages');
  if (!chatMessagesContainer) {
    console.error('Ошибка: Элемент #chatMessages не найден в DOM');
    return false;
  }
  console.log('Контейнер чата инициализирован успешно');
  return true;
}

/**
 * Добавляет новое сообщение в контейнер чата
 * @param {string} role - Роль отправителя сообщения ('user', 'assistant', 'tria', 'error')
 * @param {string} content - Текст сообщения
 * @returns {HTMLElement|null} Созданный элемент сообщения или null при ошибке
 */
export function addMessage(role, content) {
  if (!chatMessagesContainer) {
    console.error('Ошибка: Контейнер чата не инициализирован. Вызовите initializeChatDisplay() перед добавлением сообщений');
    return null;
  }
  
  // Создаем элемент сообщения
  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message');
  
  // Добавляем соответствующий класс в зависимости от роли
  if (role === 'user') {
    messageElement.classList.add('user-message');
  } else if (role === 'assistant' || role === 'tria') {
    messageElement.classList.add('tria-message');
  } else if (role === 'error') {
    messageElement.classList.add('error-message');
  }
  
  // Форматируем текст с поддержкой переносов строк
  const formattedText = content.replace(/\n/g, '<br>');
  messageElement.innerHTML = formattedText;
  
  // Добавляем сообщение в контейнер
  chatMessagesContainer.appendChild(messageElement);
  
  // Прокручиваем к новому сообщению с небольшой задержкой
  setTimeout(() => {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }, 10);
  
  return messageElement;
}

/**
 * Очищает все сообщения в контейнере чата
 * @returns {boolean} Успешность операции
 */
export function clearChat() {
  if (!chatMessagesContainer) {
    console.error('Ошибка: Контейнер чата не инициализирован. Вызовите initializeChatDisplay() перед очисткой');
    return false;
  }
  
  chatMessagesContainer.innerHTML = '';
  return true;
}

/**
 * Озвучивает текст с помощью синтезатора речи
 * @param {string} text - Текст для озвучивания
 * @returns {boolean} Успешность операции
 */
export function speak(text) {
  if (!synth) {
    console.error('Синтез речи не поддерживается в этом браузере');
    return false;
  }

  // Создаем экземпляр синтезатора речи
  const utterance = new SpeechSynthesisUtterance(text);

  // Настраиваем параметры
  utterance.lang = 'ru-RU';
  utterance.pitch = 1.0; // от 0 до 2
  utterance.rate = 1.0;  // от 0.1 до 10
  utterance.volume = 1.0; // от 0 до 1

  // Обработчик ошибок
  utterance.onerror = (event) => {
    console.error('Ошибка синтеза речи:', event.error);
  };

  // Озвучиваем текст
  synth.speak(utterance);
  return true;
}