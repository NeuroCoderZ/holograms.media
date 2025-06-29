// frontend/js/legacy-bridge.js - Мост для совместимости старого и нового кода

// Импортируем новые модули
import { state, config } from './core/init.js';
import { ui, toggleChatMode, togglePanels } from './core/ui.js';
import { sendPrompt, insertTextIntoPrompt } from './ai/prompts.js';
import { sendChatMessage, addMessageToChat } from './ai/chat.js';
// import { synthesizeSpeech, stopSpeech } from './audio/speech.js'; // Commented out as file does not exist
import { getSelectedModel, setSelectedModel } from './ai/models.js';

// Экспортируем объекты и функции для глобального доступа
window.appState = state;
window.appConfig = config;
window.appUI = ui;

// API для старого кода
window.legacyAPI = {
  // UI
  toggleChatMode,
  togglePanels,
  
  // AI
  sendPrompt,
  sendChatMessage,
  addMessageToChat,
  insertTextIntoPrompt,
  
  // Аудио
  // synthesizeSpeech,
  // stopSpeech,
  
  // Модели
  getSelectedModel,
  setSelectedModel
};

// Инициализация API для обеспечения обратной совместимости
export function initLegacyBridge() {
  console.log('Инициализация моста обратной совместимости...');
  
  // Экспортируем функции в глобальный объект window
  // (нужно только на переходный период, затем удалить и использовать импорты)
  window.toggleChatMode = toggleChatMode;
  window.togglePanels = togglePanels;
  window.sendPrompt = sendPrompt;
  window.sendChatMessage = sendChatMessage;
  window.addMessageToChat = addMessageToChat;
  // window.synthesizeSpeech = synthesizeSpeech;
  
  console.log('Мост обратной совместимости инициализирован.');
}

// Взаимодействие со старым кодом
export function registerLegacyHandlers() {
  // Перехватываем события из старого кода
  const oldSubmitHandler = window.submitPrompt;
  if (typeof oldSubmitHandler === 'function') {
    window.submitPrompt = function(text) {
      console.log('Перехвачен вызов submitPrompt из старого кода');
      return sendPrompt(text);
    };
  }
  
  // Обработка других функций при необходимости
}
