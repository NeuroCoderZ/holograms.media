/**
 * Модуль для распознавания речи и ввода в чат с использованием Web Speech API
 */

import { switchToChatMode } from '../panels/rightPanelManager.js'; // Импорт функции переключения

// Флаг для отслеживания состояния распознавания
let isRecognizing = false;

// Ссылки на DOM-элементы
let micButton = null;
let chatInput = null;
let submitButton = null; // Added for state management
let triaButton = null;   // Added for state management

// Объект распознавания речи
let recognition = null;

/**
 * Инициализирует систему распознавания речи
 * @returns {boolean} Успешность инициализации
 */
export function initializeSpeechInput(state) { // Changed signature
  console.log('Инициализация системы распознавания речи...');

  // Проверка поддержки Web Speech API
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) {
    console.error('Ошибка: Web Speech API не поддерживается в этом браузере');
    return false;
  }

  // Находим необходимые DOM-элементы
  micButton = state.uiElements.buttons.micButton;       // Changed to use state
  chatInput = state.uiElements.inputs.chatInput;         // Changed to use state
  submitButton = state.uiElements.actions.submitChatMessage; // Added for state management
  triaButton = state.uiElements.buttons.triaButton;       // Added for state management

  if (!micButton) {
    console.error('Ошибка: Элемент #micButton не найден в DOM');
    return false;
  }

  if (!chatInput) {
    console.error('Ошибка: Элемент #chatInput не найден в DOM');
    return false;
  }

  // Создаем и настраиваем объект распознавания
  recognition = new SpeechRecognitionAPI();
  recognition.continuous = false;
  recognition.lang = 'ru-RU';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  // Настраиваем обработчики событий распознавания
  setupRecognitionEvents();
  
  // Добавляем обработчик клика по кнопке микрофона
  micButton.addEventListener('click', toggleSpeechRecognition);
  
  console.log('Система распознавания речи инициализирована успешно');
  return true;
}

/**
 * Настраивает обработчики событий для объекта распознавания речи
 */
function setupRecognitionEvents() {
  // Обработка результатов распознавания
  recognition.onresult = (event) => {
    const last = event.results.length - 1;
    const transcript = event.results[last][0].transcript;
    
    console.log(`Распознанный текст: "${transcript}" (Уверенность: ${event.results[last][0].confidence.toFixed(2)})`);
    
    // Добавляем распознанный текст в поле ввода, сохраняя существующий текст
    if (chatInput.value.trim() !== '') {
      // Если поле не пустое, добавляем пробел перед новым текстом
      chatInput.value += ' ' + transcript;
    } else {
      // Если поле пустое, просто устанавливаем новый текст
      chatInput.value = transcript;
    }
    
    // Устанавливаем фокус на поле ввода
    chatInput.focus();

    // Автоматически отправляем сообщение (используем module-level submitButton)
    if (submitButton) {
      console.log('Автоматическая отправка распознанного текста...');
      submitButton.click();
    } else {
      console.error('Кнопка отправки сообщения #submitChatMessage не найдена для автоотправки');
    }
  };
  
  // Обработка ошибок распознавания
  recognition.onerror = (event) => {
    console.error(`Ошибка распознавания речи: ${event.error}`);
    stopRecognition();
  };
  
  // Обработка события отсутствия результатов
  recognition.onnomatch = () => {
    console.warn('Речь не распознана');
    stopRecognition();
  };
  
  // Обработка окончания распознавания
  recognition.onend = () => {
    console.log('Распознавание речи завершено');
    stopRecognition();
  };
  
  // Обработка начала распознавания
  recognition.onstart = () => {
    console.log('Распознавание речи начато');
    isRecognizing = true;
    micButton.classList.add('recording'); // Добавляем класс для индикации записи
  };
}

/**
 * Переключает состояние распознавания речи при клике на кнопку микрофона
 */
function toggleSpeechRecognition() {
  // Проверяем, активна ли кнопка режима Триа (используем module-level triaButton)
  if (!triaButton || !triaButton.classList.contains('active')) {
      // console.log('Голосовой ввод доступен только в режиме Триа.');
      // Здесь можно добавить визуальную обратную связь пользователю (например, мигнуть кнопкой)
      // return; // Прерываем выполнение, если режим Триа не активен - УДАЛЕНО
      console.log('TODO: Запустить визуализацию звука с микрофона (Триа не активна)');
      // Пока что прерываем, т.к. визуализация не реализована
      return;
  }
  // --- Конец добавленной проверки ---

  // Если режим Триа активен, автоматически переключаемся в чат
  console.log('Режим Триа активен, переключаемся в чат...');
  switchToChatMode(); // Вызываем импортированную функцию

  // Существующая логика переключения распознавания
  if (isRecognizing) {
    stopRecognition();
  } else {
    startRecognition();
  }
}

/**
 * Запускает распознавание речи
 */
function startRecognition() {
  if (!isRecognizing) {
    try {
      recognition.start();
      console.log('Начало записи голоса...');
    } catch (error) {
      console.error('Ошибка при запуске распознавания речи:', error);
    }
  }
}

/**
 * Останавливает распознавание речи
 */
function stopRecognition() {
  if (isRecognizing) {
    try {
      recognition.stop();
    } catch (error) {
      console.error('Ошибка при остановке распознавания речи:', error);
    }
  }
  isRecognizing = false;
  micButton.classList.remove('recording'); // Удаляем класс индикации записи
}

/**
 * Проверяет, активно ли в данный момент распознавание речи
 * @returns {boolean} Статус распознавания
 */
export function isRecognitionActive() {
  return isRecognizing;
}