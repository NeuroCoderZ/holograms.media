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

  const appendMessage = (text, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}-message`;

    // Поддержка MarkDown и переносов строк в ответах ИИ
    if (sender === 'tria') {
      const paragraphs = text.split('\n').filter(p => p.trim() !== '');
      paragraphs.forEach(p => {
        const pEl = document.createElement('p');
        pEl.textContent = p;
        msgDiv.appendChild(pEl);
      });
    } else {
      msgDiv.textContent = text;
    }

    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

      const response = await apiSendChatMessage(message, token, selectedModel);
      appendMessage(response, 'tria');
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

