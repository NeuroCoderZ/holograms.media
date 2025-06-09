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

// --- UI Tour State and Helpers ---
let isInTourMode = false;
let awaitingTourContinuation = false;
let highlightedElements = [];
let tourHighlightTimeout = null;
const AFFIRMATIVE_RESPONSES = [
  'yes', 'yep', 'yeah', 'da', 'да', 'ok', 'okay',
  'continue', 'продолжай', 'дальше', 'next', 'ага', 'угу'
];
const START_TOUR_COMMANDS = ['start tour', 'начать тур', 'расскажи об интерфейсе', 'проведи экскурсию'];
const STOP_TOUR_COMMANDS = ['stop tour', 'закончить тур', 'выйти из тура', 'стоп'];

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

      // Если пользователь начинает печатать, отменяем текущую речь и подсветку
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      if (isInTourMode) { // Only clear highlights if in tour mode and user types something potentially non-tour related
        // clearHighlightsAndDim(); // Decided to clear highlights more explicitly upon sending message or bot response
      }
    });
  } else {
    console.error('Поле ввода чата (chatInput) не найдено в state.uiElements.inputs!');
  }
  
  console.log('Чат инициализирован.');
}

// --- Speech Synthesis ---
function speakText(text) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel(); // Stop any ongoing speech before starting new
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a Russian voice
    const voices = speechSynthesis.getVoices();
    let russianVoice = voices.find(voice => voice.lang === 'ru-RU');
    if (russianVoice) {
      utterance.voice = russianVoice;
    } else {
      console.warn('Russian voice not found, using default.');
    }
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    speechSynthesis.speak(utterance);
  } else {
    console.warn('Speech Synthesis is not supported by this browser.');
  }
}

// --- Highlighting and Dimming ---
function clearHighlightsAndDim() {
  document.body.classList.remove('dimmed-for-tour');
  highlightedElements.forEach(el => el.classList.remove('highlighted-element'));
  highlightedElements = [];
  if (tourHighlightTimeout) {
    clearTimeout(tourHighlightTimeout);
    tourHighlightTimeout = null;
  }
}

function applyHighlightAndDim(textFromBot) {
  clearHighlightsAndDim(); // Clear previous state first

  const elementIdRegex = /#([a-zA-Z0-9_-]+)/g;
  let match;
  const idsToHighlight = [];
  while ((match = elementIdRegex.exec(textFromBot)) !== null) {
    idsToHighlight.push(match[1]);
  }

  if (idsToHighlight.length > 0) {
    document.body.classList.add('dimmed-for-tour');
    idsToHighlight.forEach(elementId => {
      const element = document.getElementById(elementId);
      if (element) {
        element.classList.add('highlighted-element');
        highlightedElements.push(element);
      } else {
        console.warn(`Element with ID #${elementId} not found for highlighting.`);
      }
    });

    tourHighlightTimeout = setTimeout(() => {
      clearHighlightsAndDim();
      if (isInTourMode && awaitingTourContinuation) {
        // Optional: add a message if tour timed out waiting for continuation
        // addMessageToChat('tria', "Кажется, вы здесь. Готовы продолжить тур?");
        // speakText("Кажется, вы здесь. Готовы продолжить тур?");
      }
    }, 7000); // Auto-clear after 7 seconds
  }
}

// Отправка сообщения в чат
export async function sendChatMessage(messageText) {
  if (!messageText || messageText.trim().length === 0 || isWaitingForResponse) {
    return;
  }

  // Stop any currently playing speech and clear highlights when user sends a message
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  clearHighlightsAndDim();
  
  isWaitingForResponse = true;
  const chatInput = state.uiElements.inputs.chatInput;
  let userMessage = messageText.trim(); // Use trimmed version for logic
  const lowerUserMessage = userMessage.toLowerCase();

  if (chatInput) chatInput.value = ''; // Clear input field immediately
  addMessageToChat('user', userMessage); // Display original user message

  // Tour mode logic
  if (START_TOUR_COMMANDS.some(cmd => lowerUserMessage.includes(cmd))) {
    isInTourMode = true;
    awaitingTourContinuation = false;
    userMessage = "Расскажи об интерфейсе этого приложения, начиная с основных элементов."; // Initial prompt for the tour
    addMessageToChat('system', "Запрос на начало тура..."); // System message for clarity
  } else if (STOP_TOUR_COMMANDS.some(cmd => lowerUserMessage.includes(cmd)) && isInTourMode) {
    isInTourMode = false;
    awaitingTourContinuation = false;
    clearHighlightsAndDim();
    addMessageToChat('system', "Тур завершен пользователем.");
    speakText("Хорошо, тур завершен. Если что-то еще понадобится, обращайтесь!");
    isWaitingForResponse = false;
    showLoadingIndicator(false);
    return;
  } else if (isInTourMode && awaitingTourContinuation) {
    if (AFFIRMATIVE_RESPONSES.some(resp => lowerUserMessage.includes(resp))) {
      userMessage = "Продолжай"; // Or "Next step", "Дальше"
      awaitingTourContinuation = false;
      addMessageToChat('system', "Запрос на продолжение тура..."); // System message
    } else {
      // User said something else, not affirmative, while awaiting tour continuation
      isInTourMode = false; // Exit tour mode
      awaitingTourContinuation = false;
      addMessageToChat('system', "Выход из тура из-за ответа пользователя.");
      // The original userMessage will be processed as a normal query
    }
  }
    
  try {
    showLoadingIndicator(true);
    let apiUrl = '/chat'; // Default for authorized users
    let apiPayload;

    if (isUserAuthorized()) {
      const modelSelectElement = state.uiElements.inputs.modelSelect;
      const selectedModel = getSelectedModel(modelSelectElement);
      apiPayload = { message: userMessage, model: selectedModel };
    } else {
      // Public bot / UI tour uses this endpoint
      apiUrl = '/api/v1/chat/public_chat';
      apiPayload = { message: userMessage };
    }
      
    // Делаем запрос к API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) throw new Error(`Ошибка: ${response.status} - ${await response.text()}`);

    const data = await response.json();
    if (data && data.response) {
      const botResponseText = data.response;
      addMessageToChat('tria', botResponseText);
      speakText(botResponseText); // Speak the response

      if (isInTourMode || !isUserAuthorized()) { // Apply highlights in tour mode or for public bot
        applyHighlightAndDim(botResponseText);
      }

      // Check if the bot is asking to continue the tour (heuristic)
      const lowerBotResponse = botResponseText.toLowerCase();
      if (isInTourMode && (lowerBotResponse.includes("хотите узнать") || lowerBotResponse.includes("продолжим?") || lowerBotResponse.includes("дальше?"))) {
        awaitingTourContinuation = true;
      } else if (isInTourMode) {
        // If the bot's response doesn't seem to ask for continuation, end the tour.
        // Or, the backend prompt should be solid enough to always ask for continuation if tour is active.
        // For now, if not explicitly asking to continue, we might assume the tour part is done or needs specific "next"
        // This part might need refinement based on how backend structures tour steps.
        // If bot is expected to always end with a question for continuation during tour:
        // awaitingTourContinuation = true; // if backend is designed to always ask.
        // If backend might end a tour segment without asking, then:
        // isInTourMode = false;
        // addMessageToChat('system', "Эта часть тура, похоже, завершена.");
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