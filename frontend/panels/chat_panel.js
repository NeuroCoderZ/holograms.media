// chat_panel.js - Модуль для управления панелью Чат

import { addMessageToChat } from '../js/panels/chatMessages.js'; // Import the message display function
import { sendChatMessage as sendChatMessageToApi } from '../js/services/apiService.js'; // Import API service function
import { auth } from '../js/core/firebaseInit.js'; // Import auth instance for token
import { getIdToken } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js"; // Import getIdToken

// Экспортируем функцию для инициализации панели Чат
export function initChatPanel() {
  console.log("Инициализация панели Чат");
  
  let chatContainer = document.getElementById('chatPanel');
  
  if (!chatContainer) {
    chatContainer = document.createElement('div');
    chatContainer.id = 'chatPanel';
    chatContainer.className = 'panel-content';
    chatContainer.style.display = 'none'; 
    
    const chatMessagesContainer = document.createElement('div');
    chatMessagesContainer.id = 'chatMessages';
    chatMessagesContainer.className = 'chat-messages';
    
    const chatInputContainer = document.createElement('div');
    chatInputContainer.className = 'chat-input-container';
    
    const chatInput = document.createElement('textarea');
    chatInput.id = 'chatInput';
    chatInput.placeholder = 'Введите сообщение...';
    chatInput.rows = 3;
    
    const chatSendButton = document.createElement('button');
    chatSendButton.id = 'chatSendButton';
    chatSendButton.textContent = 'Отправить';
    chatSendButton.className = 'chat-send-button';
    
    chatSendButton.addEventListener('click', () => {
      sendChatMessage(chatInput.value);
      chatInput.value = '';
    });
    
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(chatInput.value);
        chatInput.value = '';
      }
    });
    
    chatInputContainer.appendChild(chatInput);
    chatInputContainer.appendChild(chatSendButton);
    
    chatContainer.appendChild(chatMessagesContainer);
    chatContainer.appendChild(chatInputContainer);
    
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
      rightPanel.appendChild(chatContainer);
    } else {
      console.error("Элемент .right-panel не найден!");
    }
  }
}

export function showChatPanel() {
  const timelineContainer = document.getElementById('versionTimeline');
  const chatContainer = document.getElementById('chatPanel');
  const gesturesContainer = document.getElementById('gesturesPanel');
  const hologramsContainer = document.getElementById('hologramsPanel');
  
  if (timelineContainer) timelineContainer.style.display = 'none';
  if (chatContainer) chatContainer.style.display = 'block';
  if (gesturesContainer) gesturesContainer.style.display = 'none';
  if (hologramsContainer) hologramsContainer.style.display = 'none';
  
  setActivePanelButton('chatButton');
}

async function sendChatMessage(message) { // Made private, for internal use only by this module's UI
  if (!message || message.trim() === '') return;
  
  addMessageToChat('user', message); // Use the imported addMessageToChat
  
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated. Cannot send chat message.");
      addMessageToChat('system', 'Ошибка: пользователь не аутентифицирован.');
      return;
    }
    const idToken = await getIdToken(user); // Get the Firebase ID token

    const response = await sendChatMessageToApi(message, idToken); // Call the API service
    
    if (response && response.response) {
      addMessageToChat('tria', response.response);
    } else {
      throw new Error("Некорректный ответ от сервера.");
    }

  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    addMessageToChat('system', `Произошла ошибка при отправке сообщения: ${error.message || "Неизвестная ошибка"}. Попробуйте еще раз.`);
  }
}

// Function for adding a message to the chat (moved logic to chatMessages.js)
// This function is now just a placeholder for the one imported from chatMessages.js
// Kept for clarity, but the actual logic is in chatMessages.js
export function addChatMessage(role, content) {
  console.warn("Using stub addChatMessage. Ensure addMessageToChat from chatMessages.js is correctly imported and used.");
  // The actual implementation is now in frontend/js/panels/chatMessages.js
}

function setActivePanelButton(buttonId) {
  const panelButtons = document.querySelectorAll('.panel-mode-button');
  panelButtons.forEach(button => button.classList.remove('active'));
  
  const activeButton = document.getElementById(buttonId);
  if (activeButton) activeButton.classList.add('active');
} 