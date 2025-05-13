// frontend/chatMessages.js - Управление сообщениями чата и синтезом речи

import { switchToView } from './rightPanelManager.js'; // Для кнопки "вставить в промпт"

// --- Элементы DOM ---
let chatHistoryContainer = null;
let promptInput = null; // Нужно для кнопки "вставить в промпт"

/**
 * Инициализирует модуль чата, получает ссылки на DOM элементы.
 */
export function initializeChatMessages() {
  chatHistoryContainer = document.getElementById('chatMessages');
  promptInput = document.getElementById('topPromptInput'); // Получаем поле промпта

  if (!chatHistoryContainer) {
    console.error("Chat history container #chatMessages not found!");
  }
  if (!promptInput) {
    console.error("Prompt input #topPromptInput not found! Paste button won't work.");
  }
  console.log("Chat messages module initialized.");
  
  // Установка флекс-контейнера для правильного отображения сообщений снизу вверх
  if (chatHistoryContainer) {
    chatHistoryContainer.style.display = 'flex';
    chatHistoryContainer.style.flexDirection = 'column-reverse';
    chatHistoryContainer.style.justifyContent = 'flex-start';
  }
}

/**
 * Добавляет сообщение в историю чата.
 * @param {string} sender 'user' или 'tria'.
 * @param {string} message Текст сообщения.
 */
export function addMessageToChat(sender, message) {
  if (!chatHistoryContainer) return;

  const messageElement = document.createElement('div');
  messageElement.classList.add('chat-message', sender === 'user' ? 'user-message' : 'tria-message');
  messageElement.style.backgroundColor = 'transparent'; // Прозрачный фон сообщений
  messageElement.textContent = message; // Используем textContent для безопасности

  // --- Мини-кнопка "Вставить в Промпт" ---
  const pasteButton = document.createElement('button');
  pasteButton.classList.add('paste-to-prompt-btn');
  pasteButton.title = "Вставить в поле промпта";
  // Используем SVG напрямую
  pasteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="m720-120-56-56 63-64H560v-80h167l-63-64 56-56 160 160-160 160Zm-600 0v-600q0-33 23.5-56.5T200-800h480q33 0 56.5 23.5T760-720v203q-10-2-20-2.5t-20-.5q-10 0-20 .5t-20 2.5v-203H200v400h283q-2 10-2.5 20t-.5 20q0 10 .5 20t2.5 20H240L120-120Zm160-440h320v-80H280v80Zm0 160h200v-80H280v80Zm-80 80v-400 400Z"/></svg>`;

  pasteButton.addEventListener('click', (e) => {
    e.stopPropagation(); // Предотвращаем всплытие события
    if (promptInput) {
      promptInput.value = message; // Копируем текст сообщения
      promptInput.focus();
      console.log("[Chat] Message pasted to prompt input.");
      switchToView('timeline'); // Переключаемся на вид с промптом
    } else {
      console.error("Prompt input #topPromptInput not found for pasting.");
    }
  });

  messageElement.appendChild(pasteButton);
  // -----------------------------------------

  // Удаляем заглушку "История чата пуста", если она есть
  const placeholder = chatHistoryContainer.querySelector('p');
  if (placeholder && placeholder.textContent === 'История чата пуста') {
    placeholder.remove();
  }

  // Вставляем в начало контейнера для отображения снизу вверх
  chatHistoryContainer.prepend(messageElement);

  // Прокрутка вверх в flex-контейнере с column-reverse
  // При использовании flex-direction: column-reverse, scrollTop = 0 уже показывает последнее сообщение
  // Но для надежности устанавливаем его явно
  chatHistoryContainer.scrollTop = 0;
}

/**
 * Озвучивает текст с помощью Web Speech API.
 * @param {string} text Текст для озвучивания.
 */
export function speak(text) {
  if (!text) return;
  if ('speechSynthesis' in window) {
    // Останавливаем предыдущее воспроизведение, если есть
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU'; // Язык
    // Попытка найти лучший русский голос
    const voices = speechSynthesis.getVoices();
    const russianVoice = voices.find(voice => voice.lang === 'ru-RU' && voice.name.includes('Google') || voice.lang === 'ru-RU'); // Приоритет Google голосам
    if (russianVoice) {
      utterance.voice = russianVoice;
    } else {
      console.warn("Русский голос для синтеза не найден, используется голос по умолчанию.");
    }
    utterance.rate = 1;    // Скорость
    utterance.pitch = 1;   // Высота тона
    utterance.volume = 1;  // Громкость

    // Обработчик события окончания речи
    utterance.onend = () => {
      console.log("SpeechSynthesis: Озвучивание завершено.");
    };
    // Обработчик ошибок
    utterance.onerror = (event) => {
      console.error("SpeechSynthesis Error:", event.error);
    };

    // Ждем загрузки голосов (особенно при первой загрузке страницы)
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = () => {
        // Повторно пытаемся найти голос после их загрузки
        const voices = speechSynthesis.getVoices();
        const russianVoice = voices.find(voice => voice.lang === 'ru-RU' && voice.name.includes('Google') || voice.lang === 'ru-RU');
        if (russianVoice) {
          utterance.voice = russianVoice;
        }
        speechSynthesis.speak(utterance);
      };
    } else {
      speechSynthesis.speak(utterance);
    }

  } else {
    console.warn("Web Speech Synthesis API не поддерживается.");
  }
}