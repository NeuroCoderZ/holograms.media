// frontend/script.js - Основная точка входа (будет импортировать модули)
import { initializeTriaMode } from './tria_mode.js'; // Импортируем сразу

console.log(">>> Main script.js loaded (New Version)");

document.addEventListener('DOMContentLoaded', () => {
  console.log(">>> DOMContentLoaded fired from new script.js");
  // Вызываем инициализацию режима Триа
  initializeTriaMode();

  // Здесь будем вызывать инициализацию других модулей
  // import { initializeViewToggles, initializePromptBar } from './rightPanelManager.js';
  // import { initializeChatMessages } from './chatMessages.js'; // Не создаем пока
  // import { initializeSpeechInput } from './speech_input.js';
  // initializeViewToggles();
  // initializePromptBar();
  // initializeSpeechInput();

  // TODO: Перенести сюда объявления и инициализацию базовых элементов (кнопки левой панели, если нужны глобально)
  // const micButton = document.getElementById('micButton');
  // const telegramLinkButton = document.getElementById('telegramLinkButton');
  // if (micButton) { /*...*/ }
  // if (telegramLinkButton) { /*...*/ }

  console.log(">>> Base initializations (Tria Mode) complete.");
});

// Глобальные функции (если нужны, но лучше избегать)

console.log(">>> New script.js execution finished."); 