// frontend/js/ai/chat.js - Функционал чата и взаимодействие с LLM

// import { ui } from '../core/ui.js'; // Replaced with state.uiElements
// import { synthesizeSpeech } from '../audio/speech.js'; // Keep commented out if needed later
import { getSelectedModel } from './models.js';
import { state } from '../core/init.js';

// Placeholder for user authorization check
function isUserAuthorized() {
  // Placeholder: Replace with actual authorization check
  // e.g., return window.authService && window.authService.isLoggedIn();
  // For now, this will make the chat use the public_chat endpoint.
  return false;
}

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
      
      let apiUrl = '/chat';
      let apiPayload;

      if (isUserAuthorized()) {
        // Получаем выбранную модель для авторизованного пользователя
        const modelSelectElement = state.uiElements.inputs.modelSelect;
        const selectedModel = getSelectedModel(modelSelectElement);
        apiPayload = {
          message: userMessage,
          model: selectedModel
        };
      } else {
        apiUrl = '/api/v1/chat/public_chat';
        apiPayload = {
          message: userMessage
        };
      }
      
      // Делаем запрос к API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      });
      
      // Проверяем ответ
      if (!response.ok) {
        throw new Error(`Ошибка: ${response.status}`);
      }
      
      // Обрабатываем ответ
      const data = await response.json();
      if (data && data.response) {
        const botResponseText = data.response;
        // Добавляем ответ в чат
        addMessageToChat('tria', botResponseText);
        
        if (!isUserAuthorized()) {
          // Голосовой ответ для публичного бота
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(botResponseText);
            // Можно настроить голос, скорость, высоту тона и т.д. здесь
            // utterance.voice = window.speechSynthesis.getVoices()[0]; // Пример выбора голоса
            // utterance.pitch = 1;
            // utterance.rate = 1;
            window.speechSynthesis.speak(utterance);
          } else {
            console.warn('Speech Synthesis не поддерживается этим браузером.');
          }

          // Подсветка элементов
          const elementIdRegex = /#([a-zA-Z0-9_-]+)/g;
          let match;
          const highlightDuration = 3000;
          // Собираем все ID элементов для подсветки
          const idsToHighlight = [];
          while ((match = elementIdRegex.exec(botResponseText)) !== null) {
            idsToHighlight.push(match[1]);
          }

          if (idsToHighlight.length > 0) {
            document.body.classList.add('dimmed');

            idsToHighlight.forEach((elementId, index) => {
              const elementToHighlight = document.getElementById(elementId);
              if (elementToHighlight) {
                elementToHighlight.classList.add('highlight');

                // Убираем подсветку и затемнение после задержки
                // Если это последний элемент, то убираем затемнение всего body
                setTimeout(() => {
                  elementToHighlight.classList.remove('highlight');
                  if (index === idsToHighlight.length - 1) {
                    document.body.classList.remove('dimmed');
                  }
                }, highlightDuration);
              } else {
                console.warn(`Элемент с ID #${elementId} не найден для подсветки.`);
                // Если элемент не найден, и это последний элемент, убираем dim
                 if (index === idsToHighlight.length - 1) {
                    // Check if other highlights are still active (this simple version doesn't track them)
                    // For now, just remove dim if this was the last ID processed.
                    // A more robust solution would count active highlights.
                    let stillHighlighted = false;
                    idsToHighlight.forEach(id => {
                        const el = document.getElementById(id);
                        if(el && el.classList.contains('highlight')){
                            stillHighlighted = true;
                        }
                    });
                    if(!stillHighlighted) {
                         document.body.classList.remove('dimmed');
                    }
                  }
              }
            });
          }
        } else {
          // Если нужно синтезировать речь для авторизованного пользователя (старая логика)
          if (data.should_vocalize) {
            // synthesizeSpeech(data.response); // Keep commented out if needed later
            console.log('Функция synthesizeSpeech временно отключена для авторизованного пользователя');
          }
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