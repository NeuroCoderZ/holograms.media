// frontend/js/domEventHandlers.js

import { state } from './core/init.js';
import { toggleXRMode } from './xr/cameraManager.js';
import { applyPrompt } from './ai/promptHandler.js'; // Предполагается, что эта функция будет в отдельном модуле AI

/**
 * Инициализирует обработчики событий для элементов DOM.
 */
export function setupDOMEventHandlers() {
  const xrButton = document.getElementById('xrButton');
  const promptButton = document.getElementById('promptButton');
  const promptModal = document.getElementById('promptModal');
  const closePromptModal = document.getElementById('closePromptModal');
  const submitPromptButton = document.getElementById('submitPromptButton');
  const promptText = document.getElementById('promptText');
  const topPromptInput = document.getElementById('topPromptInput');
  const submitTopPrompt = document.getElementById('submitTopPrompt');

  if (xrButton) {
    xrButton.addEventListener('click', () => {
      toggleXRMode();
    });
  }

  // Обработчик для кнопки промпта
  if (promptButton) {
    promptButton.addEventListener('click', () => {
      if (promptModal) {
        promptModal.style.display = 'block';
      }
    });
  }

  if (closePromptModal) {
    closePromptModal.addEventListener('click', () => {
      if (promptModal) {
        promptModal.style.display = 'none';
      }
    });
  }

  if (submitPromptButton) {
    submitPromptButton.addEventListener('click', () => {
      const prompt = promptText ? promptText.value.trim() : '';
      if (prompt) {
        // TODO: Убедиться, что applyPrompt доступна и корректно импортирована
        // applyPrompt(prompt, document.getElementById('modelSelect').value);
        console.log('Prompt submitted:', prompt);
        if (promptText) promptText.value = '';
        if (promptModal) promptModal.style.display = 'none';
      } else {
        alert('Пожалуйста, введите промпт.');
      }
    });
  }

  // --- Top Prompt Bar ---
  if (submitTopPrompt) {
    submitTopPrompt.addEventListener('click', () => {
      const prompt = topPromptInput ? topPromptInput.value.trim() : '';
      if (prompt) {
        // TODO: Убедиться, что applyPrompt доступна и корректно импортирована
        // applyPrompt(prompt, document.getElementById('modelSelect').value);
        console.log('Top prompt submitted:', prompt);
        if (topPromptInput) topPromptInput.value = '';
      } else {
        alert('Пожалуйста, введите промпт.');
      }
    });
  }

  // Добавьте другие обработчики событий DOM по мере необходимости
}

// TODO: Перенести сюда вспомогательные функции, связанные с DOM, если таковые имеются.