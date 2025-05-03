// chat_panel.js - Модуль для управления панелью Чат

// Экспортируем функцию для инициализации панели Чат
export function initChatPanel() {
  console.log("Инициализация панели Чат");
  
  // Создаем контейнер для чата, если его еще нет
  let chatContainer = document.getElementById('chatPanel');
  
  if (!chatContainer) {
    // Создаем контейнер панели чата
    chatContainer = document.createElement('div');
    chatContainer.id = 'chatPanel';
    chatContainer.className = 'panel-content';
    chatContainer.style.display = 'none'; // По умолчанию скрыт
    
    // Создаем структуру панели чата
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
    
    // Добавляем обработчик для отправки сообщений
    chatSendButton.addEventListener('click', () => {
      sendChatMessage(chatInput.value);
      chatInput.value = '';
    });
    
    // Добавляем обработчик для отправки по Enter (с Shift+Enter для переноса строки)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(chatInput.value);
        chatInput.value = '';
      }
    });
    
    // Собираем структуру
    chatInputContainer.appendChild(chatInput);
    chatInputContainer.appendChild(chatSendButton);
    
    chatContainer.appendChild(chatMessagesContainer);
    chatContainer.appendChild(chatInputContainer);
    
    // Добавляем контейнер в правую панель
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
      rightPanel.appendChild(chatContainer);
    } else {
      console.error("Элемент .right-panel не найден!");
    }
  }
}

// Функция для отображения панели чата
export function showChatPanel() {
  const timelineContainer = document.getElementById('versionTimeline');
  const chatContainer = document.getElementById('chatPanel');
  const gesturesContainer = document.getElementById('gesturesPanel');
  const hologramsContainer = document.getElementById('hologramsPanel');
  
  // Показываем чат, скрываем остальные панели
  if (timelineContainer) timelineContainer.style.display = 'none';
  if (chatContainer) chatContainer.style.display = 'block';
  if (gesturesContainer) gesturesContainer.style.display = 'none';
  if (hologramsContainer) hologramsContainer.style.display = 'none';
  
  // Активируем соответствующую кнопку в навигации режимов
  setActivePanelButton('chatButton');
}

// Функция для отправки сообщения чата
export async function sendChatMessage(message) {
  if (!message || message.trim() === '') return;
  
  // Добавляем сообщение пользователя в чат
  addChatMessage('user', message);
  
  try {
    // Отправляем сообщение на сервер
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Добавляем ответ от сервера в чат
    addChatMessage('assistant', data.response);
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    addChatMessage('system', 'Произошла ошибка при отправке сообщения. Попробуйте еще раз.');
  }
}

// Функция для добавления сообщения в чат
export function addChatMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${role}-message`;
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  contentElement.textContent = content;
  
  messageElement.appendChild(contentElement);
  chatMessages.appendChild(messageElement);
  
  // Прокручиваем чат вниз
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Вспомогательная функция для установки активной кнопки панели
function setActivePanelButton(buttonId) {
  // Сначала убираем класс active со всех кнопок панелей
  const panelButtons = document.querySelectorAll('.panel-mode-button');
  panelButtons.forEach(button => button.classList.remove('active'));
  
  // Затем добавляем класс active нужной кнопке
  const activeButton = document.getElementById(buttonId);
  if (activeButton) activeButton.classList.add('active');
} 