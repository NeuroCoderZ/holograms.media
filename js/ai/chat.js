// js/ai/chat.js

import { sendChatMessage as apiSendChatMessage } from '../services/apiService.js';
import { getJwtToken } from '../core/auth.js';

let isChatInitialized = false;

export function initializeTriaChat() {
  console.log("Инициализация чата Триа через Backend API...");

  const messagesContainer = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendButton = document.getElementById('submitChatMessage');
  const loadingIndicator = document.getElementById('loadingIndicator');

  if (!messagesContainer || !chatInput || !sendButton || !loadingIndicator) {
    console.error("Не удалось инициализировать чат: элементы DOM не найдены.");
    return;
  }

  isChatInitialized = true;

  /**
   * Добавляет сообщение в контейнер. 
   * Если sender === 'tria', возвращает функцию для "допечатывания" текста.
   */
  const appendMessage = (text, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}-message`;

    if (sender === 'tria') {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'tria-content';
        // Fix: Prevent text gluing
        contentDiv.style.whiteSpace = 'pre-wrap';
        contentDiv.style.wordBreak = 'break-word';
        msgDiv.appendChild(contentDiv);
        messagesContainer.appendChild(msgDiv);

        const TYPING_DELAY_MS = 18;
        const charQueue = [];
        let isTyping = false;

        const flushQueue = () => {
            if (charQueue.length === 0) { isTyping = false; return; }
            isTyping = true;
            // Fix: Use textContent to preserve whitespace
            contentDiv.textContent += charQueue.shift();
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            setTimeout(flushQueue, TYPING_DELAY_MS);
        };

        const updateContent = (newChunk) => {
            for (const char of newChunk) charQueue.push(char);
            if (!isTyping) flushQueue();
        };

        if (text) updateContent(text);
        return updateContent;
    } else {
        msgDiv.textContent = text;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return null;
    }
  };

  const handleSend = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    appendMessage(message, 'user');
    loadingIndicator.style.display = 'block';

    try {
      const token = getJwtToken();
      if (!token) {
        throw new Error("Для общения с Триа необходима авторизация.");
      }

      const modelSelect = document.getElementById('modelSelect');
      const selectedModel = modelSelect ? modelSelect.value : null;

      // Создаем контейнер для ответа ИИ заранее
      const updateTriaUI = appendMessage('', 'tria');
      let streamedText = '';

      const fullText = await apiSendChatMessage(message, token, selectedModel, (chunk) => {
        streamedText += chunk;
        updateTriaUI(chunk);
      });

      if (!streamedText.trim() && !(fullText || '').trim()) {
        updateTriaUI('Триа не смогла сформировать ответ. Попробуйте уточнить запрос и отправить его еще раз.');
      }
      
    } catch (error) {
      console.error("Chat error:", error);
      appendMessage("Триа недоступна. Ошибка: " + error.message, 'tria');
    } finally {
      loadingIndicator.style.display = 'none';
    }
  };

  sendButton.onclick = handleSend;

  chatInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
  });

  console.log("Чат Триа успешно инициализирован и подключен к бэкенду.");
}

export const setupChat = initializeTriaChat;

export function sendChatMessage(message) {
  if (isChatInitialized) {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('submitChatMessage');
    if (chatInput && sendButton) {
      chatInput.value = message;
      sendButton.click();
    }
  } else {
    console.warn("Чат не инициализирован. Вызовите initializeTriaChat() сначала.");
  }
}

