// frontend/js/ai/chat.js - Функционал чата и взаимодействие с LLM

// import { ui } from '../core/ui.js'; // Replaced with state.uiElements
// import { synthesizeSpeech } from '../audio/speech.js'; // Keep commented out if needed later
import { getSelectedModel } from './models.js';
import { state } from '../core/init.js';

// Хранилище сообщений чата
let chatMessages = [];
let isWaitingForResponse = false;
let chatHistoryContainer = null; // Will be initialized in setupChat

// Инициализация чата
export function setupChat() {
  console.log('Инициализация чата...');
  
  // Initialize chatHistoryContainer for addMessageToChat
  // Assuming chatHistory is the scrollable container for messages.
  // If state.uiElements.containers.chatMessages is the actual message list, use that.
  // Based on context, state.uiElements.chatHistory seems more likely for the scrollable container.
  // Let's assume it's state.uiElements.containers.chatMessages that should be scrolled.
  chatHistoryContainer = state.uiElements.containers.chatMessages;

  if (!chatHistoryContainer) {
    console.error('Контейнер для истории чата (chatMessages) не найден в state.uiElements.containers!');
    // If chatMessages is the one, then the error message was slightly off.
    // If it's actually a different element like 'chatHistoryPanel' that contains 'chatMessages',
    // then this needs to be reassessed based on actual HTML structure.
    // For now, proceeding with chatMessages as the scrollable container.
    return;
  }
  
  // Настраиваем обработчики событий для поля ввода
  const chatInput = state.uiElements.inputs.chatInput; // Use state.uiElements
  if (chatInput) {
    // Обработчик ввода текста
    chatInput.addEventListener('input', function() {
      // Автоматически увеличиваем высоту поля ввода при необходимости
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  } else {
    console.error('Поле ввода чата (chatInput) не найдено в state.uiElements.inputs!');
  }
  
  console.log('Чат инициализирован.');
}

// Отправка сообщения в чат
export async function sendChatMessage(messageText) {
  if (!messageText || messageText.trim().length === 0 || isWaitingForResponse) {
    return;
  }
  
  // Блокируем повторную отправку
  isWaitingForResponse = true;
  
  // Получаем поле ввода и очищаем его
  const chatInput = state.uiElements.inputs.chatInput; // Use state.uiElements
  if (chatInput) {
    // Сохраняем сообщение
    const userMessage = messageText;
    chatInput.value = '';
    
    // Добавляем сообщение пользователя в чат
    addMessageToChat('user', userMessage);
    
    try {
      // Отображаем индикатор загрузки
      showLoadingIndicator(true);
      
      // Получаем выбранную модель
      const modelSelectElement = state.uiElements.inputs.modelSelect;
      const selectedModel = getSelectedModel(modelSelectElement);
      
      // Делаем запрос к API
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          model: selectedModel
        })
      });
      
      // Проверяем ответ
      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status}`);
      }
      
      // Обрабатываем ответ
      const data = await response.json();
      if (data && data.response) {
        // Добавляем ответ в чат
        addMessageToChat('tria', data.response);
        
        // Если нужно синтезировать речь
        if (data.should_vocalize) {
          // synthesizeSpeech(data.response); // Keep commented out if needed later
          console.log('Функция synthesizeSpeech временно отключена');
        }
      } else {
        throw new Error('Некорректный ответ от сервера');
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      addMessageToChat('tria', `Произошла ошибка: ${error.message}`);
    } finally {
      // Скрываем индикатор загрузки
      showLoadingIndicator(false);
      isWaitingForResponse = false;
    }
  }
}

// Добавление сообщения в чат
export function addMessageToChat(sender, messageText) {
  if (!chatHistoryContainer) {
    console.error('Контейнер для сообщений чата не найден!');
    return;
  }
  
  // Создаем элемент сообщения
  const messageElement = document.createElement('div');
  messageElement.className = `chat-message ${sender}-message`;
  
  // Форматируем сообщение (поддержка кода и маркдауна)
  const formattedMessage = formatMessage(messageText);
  messageElement.innerHTML = formattedMessage;
  
  // Добавляем в контейнер
  chatHistoryContainer.appendChild(messageElement);
  
  // Прокручиваем к новому сообщению
  setTimeout(() => {
    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
  }, 10);
  
  // Добавляем в массив сообщений
  chatMessages.push({ sender, message: messageText, timestamp: new Date().toISOString() });
}

// Форматирование сообщения (базовый маркдаун)
function formatMessage(message) {
  if (!message) return '';
  
  // Экранируем HTML
  let formatted = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Заменяем ```code``` на блоки кода
  formatted = formatted.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code}</code></pre>`;
  });
  
  // Заменяем `code` на инлайн-код
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Заменяем **bold** на жирный текст
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Заменяем *italic* на курсив
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Заменяем \n на <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

// Показать/скрыть индикатор загрузки
function showLoadingIndicator(show) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'block' : 'none';
  }
}

// Экспортируем для возможного использования в других модулях
export { chatMessages };