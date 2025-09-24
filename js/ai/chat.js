// js/ai/chat.js

// Импортируем напрямую "мозг" NLWeb, минуя его стандартный UI
import { ModernChatInterface } from 'https://throbbing-wave-797e-nlweb.neurocoderz.workers.dev/fp-chat-interface-snippet.js';

let triaInterface;

/**
 * Инициализирует и настраивает чат Триа на базе NLWeb.
 * Эта функция подключает логику NLWeb к существующим элементам UI.
 */
function initializeTriaChat() {
  console.log("Инициализация чата Триа на базе NLWeb...");

  // Находим обязательные элементы UI в DOM
  const messagesContainer = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendButton = document.getElementById('submitChatMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');

  // Проверяем, все ли элементы на месте
  if (!messagesContainer || !chatInput || !sendButton || !loadingIndicator) {
    console.warn("Chat elements status:", {
      messagesContainer: !!messagesContainer,
      chatInput: !!chatInput,
      sendButton: !!sendButton,
      loadingIndicator: !!loadingIndicator
    });
    console.error("Не удалось инициализировать чат: один или несколько HTML-элементов не найдены.");
    return;
  }

  // Создаем экземпляр интерфейса чата
  triaInterface = new ModernChatInterface({
    skipAutoInit: true // Мы инициализируем его вручную
  });

  // "Скармливаем" нашему экземпляру чата наши собственные элементы DOM.
  // Настраиваем сайт/контекст для запросов
  triaInterface.selectedSite = 'https://throbbing-wave-797e-nlweb.neurocoderz.workers.dev';
  triaInterface.elements.messagesContainer = messagesContainer;
  triaInterface.elements.chatInput = chatInput;
  triaInterface.elements.sendButton = sendButton;
  triaInterface.elements.loadingIndicator = loadingIndicator;



  // Создаем новую сессию чата
  triaInterface.createNewChat(null, triaInterface.selectedSite);

  // Переопределяем стандартные обработчики событий, чтобы они работали с нашим UI
  sendButton.onclick = () => {
    const message = chatInput.value.trim();
    if (message) {
      triaInterface.sendMessage(message);
      chatInput.value = '';
      chatInput.style.height = 'auto'; // Сбрасываем высоту поля ввода
    }
  };

  chatInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendButton.click();
    }
  };
  
  // Добавляем авто-изменение размера поля ввода
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
  });

  console.log("Чат Триа успешно инициализирован и готов к работе.");
}

export { initializeTriaChat };
// Алиасы для совместимости с импортами в main.js
export const setupChat = initializeTriaChat;

/**
 * Отправляет сообщение в чат, если интерфейс инициализирован.
 * @param {string} message - Сообщение для отправки.
 */
function sendChatMessage(message) {
  if (triaInterface) {
    triaInterface.sendMessage(message);
  } else {
    console.warn("Чат не инициализирован. Вызовите initializeTriaChat() сначала.");
  }
}

export { sendChatMessage };

