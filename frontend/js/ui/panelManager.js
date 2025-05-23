// frontend/js/ui/panelManager.js - Модуль для управления панелями интерфейса

// --- Переменные модуля ---
let leftPanel = null;
let rightPanel = null;
let togglePanelsButton = null;

/**
 * Инициализирует состояние панелей (видимость/скрытие)
 */
export function initializePanelState() {
  // Получаем ссылки на панели
  // Получаем ссылки на панели и кнопку, используя соответствующие селекторы
  leftPanel = document.querySelector('.panel.left-panel');
  rightPanel = document.querySelector('.panel.right-panel');
  togglePanelsButton = document.getElementById('togglePanelsButton'); // Кнопка имеет ID

  // Проверяем наличие панелей и кнопки
  if (!leftPanel || !rightPanel || !togglePanelsButton) {
    console.error('Не удалось найти все необходимые элементы для управления панелями');
    return;
  }

  // Получаем сохраненное состояние
  const savedState = localStorage.getItem('panelsHidden');
  const shouldBeHidden = savedState === 'true';

  console.log(`[DEBUG] Initializing panel state. Saved state: ${savedState}, shouldBeHidden: ${shouldBeHidden}`);

  // Применяем классы
  leftPanel.classList.toggle('hidden', shouldBeHidden);
  rightPanel.classList.toggle('hidden', shouldBeHidden);
  togglePanelsButton.classList.toggle('show-mode', shouldBeHidden);

  console.log(`[DEBUG] After init: leftPanel hidden=${leftPanel.classList.contains('hidden')}, rightPanel hidden=${rightPanel.classList.contains('hidden')}, button show-mode=${togglePanelsButton.classList.contains('show-mode')}`);

  // Вызываем ресайз после применения классов
  // Небольшая задержка для гарантии применения стилей
  setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      console.log('Dispatched resize event after panel init timeout.');
  }, 50);

  console.log(`Состояние панелей инициализировано (${shouldBeHidden ? 'скрыты' : 'показаны'})`);
}

/**
 * Переключает видимость боковых панелей
 */
function togglePanels() {
  if (!leftPanel || !rightPanel || !togglePanelsButton) {
    console.error('Панели или кнопка не инициализированы');
    return;
  }

  const willBeHidden = !leftPanel.classList.contains('hidden');
  console.log('Toggling panels, willBeHidden:', willBeHidden);

  // Перемещаем кнопку в body, если она еще не там (логика из script.js)
  if (togglePanelsButton.parentNode !== document.body) {
      document.body.appendChild(togglePanelsButton);
      console.log('Moved togglePanelsButton to body');
  }

  // Переключаем классы
  leftPanel.classList.toggle('hidden', willBeHidden);
  rightPanel.classList.toggle('hidden', willBeHidden);
  togglePanelsButton.classList.toggle('show-mode', willBeHidden);

  // Сохраняем состояние в localStorage
  localStorage.setItem('panelsHidden', willBeHidden.toString());

  // Вызываем ресайз после переключения
  setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
  }, 50);

  console.log(`Панели ${willBeHidden ? 'скрыты' : 'показаны'}`);
}

/**
 * Инициализирует управление панелями
 * Находит DOM-элементы, устанавливает начальное состояние и назначает обработчики событий
 */
export function initializePanelManager() {
  console.log('Инициализация управления панелями...');
  
  // Инициализируем состояние панелей
  initializePanelState();
  
  // Добавляем обработчик для кнопки переключения панелей
  if (togglePanelsButton) {
    togglePanelsButton.addEventListener('click', togglePanels);
    console.log('Обработчик для кнопки переключения панелей добавлен');
  } else {
    console.error('Кнопка переключения панелей не найдена');
  }
  
  console.log('Инициализация управления панелями завершена');
}

// Экспортируем функции для использования в других модулях
export { togglePanels };