// Модуль для реализации режима Триа в holograms.media
// Обеспечивает переключение между отправкой запросов на /tria/invoke или /generate

// Экспортируем глобальную переменную для режима Триа
export let isTriaModeActive = false;

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
  triaButton.classList.toggle('active', isTriaModeActive);

  // Добавляем обработчик события клика для переключения режима
  triaButton.addEventListener('click', () => {
    // Инвертируем значение
    isTriaModeActive = !isTriaModeActive;
    
    // Обновляем класс для визуальной индикации
    triaButton.classList.toggle('active', isTriaModeActive);
    
    // Выводим в консоль сообщение о режиме Триа
    if (isTriaModeActive) {
      console.log("Режим 'Медленное Обучение Триа' АКТИВИРОВАН (заглушка).");
    } else {
      console.log("Режим 'Медленное Обучение Триа' ДЕАКТИВИРОВАН (заглушка).");
    }
  });

  console.log("Логика переключателя режима Триа инициализирована");
}

// Функция для отправки запроса в зависимости от режима
export async function applyPromptWithTriaMode(prompt, model) {
  console.log(`Отправка промпта "${prompt}" с моделью ${model} ${isTriaModeActive ? 'на /tria/invoke' : 'на /generate'}`);

  const spinner = document.getElementById('loading-spinner');
  const submitButton = document.getElementById('submitTopPrompt');

  // Показываем спиннер и блокируем кнопку
  if (spinner) spinner.style.display = 'block';
  if (submitButton) submitButton.disabled = true;

  try {
    // Проверяем, активен ли режим Триа
    if (isTriaModeActive) {
      console.log('Режим Триа активен, отправляем запрос на /tria/invoke');

      // Отправляем запрос на /tria/invoke (используем относительный путь)
      const response = await fetch('/tria/invoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: prompt }) // Используем тот же промпт
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
    alert(`Ошибка при отправке запроса к Триа: ${error.message}`);
    
    throw error; // Пробрасываем ошибку дальше
  }
}

// Инициализируем модуль при загрузке DOM
document.addEventListener('DOMContentLoaded', initializeTriaMode);