// chat.js

import { addMessage } from './uiManager.js'; // Предполагается, что addMessage будет в uiManager
import { speak } from './audio.js'; // Предполагается, что speak будет в audio

// Флаг ожидания ответа от Триа
let isWaitingForResponse = false;

// Функция для отправки сообщения в чат
export function sendChatMessage() {
  // Проверяем, не ожидаем ли мы ответа на предыдущее сообщение
  if (isWaitingForResponse) {
    console.log('Ожидается ответ на предыдущее сообщение');
    return;
  }

  const chatInput = document.getElementById('chatInput');
  const messageText = chatInput.value.trim();
  const modelSelect = document.getElementById('modelSelect');
  const selectedModel = modelSelect.value;
  const submitChatMessage = document.getElementById('submitChatMessage');

  if (messageText) {
    // Блокируем повторную отправку
    isWaitingForResponse = true;
    if (submitChatMessage) submitChatMessage.disabled = true;

    // Показываем индикатор загрузки
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    // Добавляем сообщение пользователя в чат
    addMessage('user', messageText);

    // Очищаем поле ввода
    chatInput.value = '';

    // Получаем историю чата для контекста (последние 10 сообщений)
    const chatMessages = document.getElementById('chatMessages');
    const chatHistory = [];
    if (chatMessages) {
      const messageElements = chatMessages.querySelectorAll('.chat-message');
      const lastMessages = Array.from(messageElements).slice(-10); // Берем последние 10 сообщений

      lastMessages.forEach(msgElement => {
        const role = msgElement.classList.contains('user-message') ? 'user' : 'assistant';
        const content = msgElement.textContent;
        chatHistory.push({ role, content });
      });
    }

    // Отправляем запрос на сервер для получения ответа от выбранной LLM модели
    window.axios.post('/chat', {
      message: messageText,
      model: selectedModel,
      history: chatHistory
    })
    .then(response => {
      // Скрываем индикатор загрузки
      if (loadingIndicator) loadingIndicator.style.display = 'none';

      // Добавляем ответ от ИИ в чат
      if (response.data && response.data.response) {
        addMessage('tria', response.data.response);
        // Озвучиваем ответ Триа
        if (response.data.response) { // Проверяем, что ответ не пустой
            speak(response.data.response);
        }
      } else {
        addMessage('tria', 'Получен пустой ответ от сервера.');
      }

      // Сбрасываем флаг ожидания и разблокируем кнопку
      isWaitingForResponse = false;
      if (submitChatMessage) submitChatMessage.disabled = false;
    })
    .catch(error => {
      // Скрываем индикатор загрузки
      if (loadingIndicator) loadingIndicator.style.display = 'none';

      console.error('Ошибка при отправке сообщения:', error);

      // Добавляем сообщение об ошибке в чат
      addMessage('tria', `Ошибка при обработке запроса: ${error.message || 'Неизвестная ошибка'}`);

      // Сбрасываем флаг ожидания и разблокируем кнопку
      isWaitingForResponse = false;
      if (submitChatMessage) submitChatMessage.disabled = false;
    });
  }
}

// Функция для загрузки истории чата
export function loadChatHistory() {
  const chatId = localStorage.getItem('current_chat_id');

  if (!chatId) {
    console.log('История чата не найдена');
    return;
  }

  // Показываем индикатор загрузки
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'block';

  window.axios.get(`/chat/history/${chatId}`)
    .then(response => {
      // Скрываем индикатор загрузки
      if (spinner) spinner.style.display = 'none';

      const messages = response.data.messages || [];

      // Очищаем текущую историю
      const chatMessages = document.getElementById('chatMessages');
      if (chatMessages) {
        chatMessages.innerHTML = '';
      }

      // Добавляем сообщения из истории
      messages.forEach(msg => {
        // Конвертируем 'assistant' в 'tria' для addMessageToChat
        const sender = msg.role === 'assistant' ? 'tria' : 'user';
        addMessage(sender, msg.content);
      });
    })
    .catch(error => {
      // Скрываем индикатор загрузки
      if (spinner) spinner.style.display = 'none';

      console.error('Ошибка при загрузке истории чата:', error);
    });
}

// Инициализация обработчиков событий чата
export function initializeChatEventHandlers() {
  const submitChatMessage = document.getElementById('submitChatMessage');
  if (submitChatMessage) {
    submitChatMessage.addEventListener('click', sendChatMessage);
  }

  const chatInputField = document.getElementById('chatInput');
  if (chatInputField) {
    chatInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !isWaitingForResponse) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
}

// Восстанавливаем экспорт функции в глобальный контекст (временное решение)
window.loadChatHistory = loadChatHistory;