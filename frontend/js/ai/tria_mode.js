// Модуль для реализации режима Триа в holograms.media
// Обеспечивает переключение между отправкой запросов на /tria/invoke или /generate

// Импортируем объект state из модуля init.js
import { state } from '../core/init.js';

// Экспортируем функцию для получения состояния режима Триа
export function isTriaModeActive() {
  return state.isTriaModeActive;
}

// Функция инициализации кнопки и режима Триа
export function initializeTriaMode() {
  // Получаем ссылку на кнопку
  const triaButton = document.getElementById('triaButton');

  // Проверка наличия кнопки
  if (!triaButton) {
    console.error("Элемент #triaButton не найден!");
    return;
  }

  // Инициализируем состояние кнопки
  triaButton.classList.toggle('active', state.isTriaModeActive);

  // Добавляем обработчик события клика для переключения режима
  triaButton.addEventListener('click', () => {
    // Инвертируем значение в объекте state
    state.isTriaModeActive = !state.isTriaModeActive;
    
    // Обновляем класс для визуальной индикации
    triaButton.classList.toggle('active', state.isTriaModeActive);
    
    // Выводим в консоль сообщение о смене режима
    console.log(`Режим Триа ${state.isTriaModeActive ? 'АКТИВИРОВАН' : 'ДЕАКТИВИРОВАН'}`);    
  });

  console.log("Логика переключателя режима Триа инициализирована");
}

// Функция для отправки запроса в зависимости от режима
export async function applyPromptWithTriaMode(prompt, model) {
  console.log(`Отправка промпта "${prompt}" с моделью ${model} ${state.isTriaModeActive ? 'на /chat' : 'на /generate'}`);

  const spinner = document.getElementById('loading-spinner');
  const submitButton = document.getElementById('submitTopPrompt');

  // Показываем спиннер и блокируем кнопку
  if (spinner) spinner.style.display = 'block';
  if (submitButton) submitButton.disabled = true;

  try {
    // Проверяем, активен ли режим Триа
    if (state.isTriaModeActive) {
      console.log('Режим Триа активен, отправляем запрос на /chat');

      // Отправляем запрос на /chat (используем относительный путь)
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: prompt, model: model || 'mistral-small-latest' }) // Используем тот же промпт
      });

      if (!response.ok) {
        throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Скрываем спиннер и разблокируем кнопку
      if (spinner) spinner.style.display = 'none';
      if (submitButton) submitButton.disabled = false;

      console.log('Ответ от Триа:', data.response);
      return data;
    } else {
      // Если режим Триа не активен, возвращаем false, чтобы основной код мог
      // выполнить стандартную логику отправки на /generate
      return false;
    }
  } catch (error) {
    // Скрываем спиннер и разблокируем кнопку при ошибке
    if (spinner) spinner.style.display = 'none';
    if (submitButton) submitButton.disabled = false;
    
    console.error('Ошибка при вызове /tria/invoke:', error);
    console.warn(`Ошибка при отправке запроса к Триа: ${error.message}`);
    
    // Не пробрасываем ошибку дальше, чтобы не блокировать UI
    return { response: `Ошибка при обращении к Триа: ${error.message}`, error: true }
  }
}

// Инициализируем модуль при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeTriaMode);