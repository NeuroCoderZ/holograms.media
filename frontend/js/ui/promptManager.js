// frontend/js/ui/promptManager.js

import { applyPromptWithTriaMode } from '../ai/tria_mode.js';
import { addMessageToChat } from '../panels/chatMessages.js'; // Импортируем addMessageToChat для вывода ответов

/**
 * Инициализирует менеджер промптов.
 */
export function initializePromptManager() {
  console.log('Prompt manager initialized (stub)');
}

/**
 * Обрабатывает отправку промпта из верхнего поля ввода.
 * @param {string} prompt - Текст промпта.
 * @param {string} model - Выбранная модель LLM.
 */
export function applyTopPrompt(prompt, model) {
  // Enhance the prompt before applying it
  const enhancedPrompt = enhancePrompt(prompt);

  // Сначала проверяем, активен ли режим Триа через функцию из модуля tria_mode.js
  applyPromptWithTriaMode(enhancedPrompt, model)
    .then(result => {
      // Если функция вернула результат (не false), значит запрос к Триа был выполнен
      // и обработан внутри неё, поэтому выходим из функции
      if (result) return;

      // Если вернулся false, продолжаем стандартную логику отправки на /generate
      console.log('Отправка промпта на /generate (стандартный режим)');
      const spinner = document.getElementById('loading-spinner');
      const submitButton = document.getElementById('submitTopPrompt');

      // Показываем спиннер и блокируем кнопку
      if (spinner) spinner.style.display = 'block';
      if (submitButton) submitButton.disabled = true;

      // Шаг 1: Отправка запроса на /generate (существующая логика)
      axios.post('/generate', { prompt: enhancedPrompt, model })
        .then(generateResponse => {
          // Этот блок выполняется после успешного ответа от /generate
          console.log('Ответ от /generate:', generateResponse.data);
          const backgroundColor = generateResponse.data.backgroundColor; // Получаем цвет фона
          const triaResponse = generateResponse.data.response; // Получаем ответ Триа

          // Обновляем цвет фона, если он пришел в ответе
          if (backgroundColor) {
            document.body.style.backgroundColor = backgroundColor;
            console.log(`Цвет фона обновлен на: ${backgroundColor}`);
          }

          // Добавляем ответ Триа в чат (если есть)
          if (triaResponse) {
              addMessageToChat('tria', triaResponse);
              // Озвучиваем ответ Триа
              // speak(triaResponse); // TODO: Функция speak должна быть доступна или импортирована
          }

          // Шаг 2: Отправка запроса на /execute (если есть код)
          const codeToExecute = generateResponse.data.code;
          if (codeToExecute) {
            console.log('Получен код для выполнения:', codeToExecute);
            // TODO: Реализовать выполнение кода на фронтенде или отправку на бэкенд для выполнения
            // Временно просто логируем или отображаем
            addMessageToChat('tria', `Получен код для выполнения:\n\`\`\`javascript\n${codeToExecute}\n\`\`\``);
          }

          // Скрываем спиннер и разблокируем кнопку
          if (spinner) spinner.style.display = 'none';
          if (submitButton) submitButton.disabled = false;
        })
        .catch(error => {
          // Скрываем спиннер и разблокируем кнопку при ошибке
          if (spinner) spinner.style.display = 'none';
          if (submitButton) submitButton.disabled = false;

          console.error('Ошибка при выполтке запроса /generate:', error);
          addMessageToChat('error', `Ошибка при обработке промпта: ${error.message || 'Неизвестная ошибка'}`);
        });
    })
    .catch(error => {
        console.error('Ошибка в applyPromptWithTriaMode:', error);
        addMessageToChat('error', `Ошибка в режиме Триа: ${error.message || 'Неизвестная ошибка'}`);
    });
// Function to enhance the prompt
function enhancePrompt(prompt) {
  // Add relevant context
  const context = "Additional context to enhance the prompt.";
  // Ensure clarity
  const clearPrompt = prompt.trim();
  // Offer alternative phrasing
  const alternatives = [
    "Alternative phrasing 1",
    "Alternative phrasing 2",
    "Alternative phrasing 3"
  ];
  const alternative = alternatives[Math.floor(Math.random() * alternatives.length)];

  return `${context} ${clearPrompt} ${alternative}`;
}
}

// TODO: Возможно, добавить другие функции, связанные с управлением промптами.