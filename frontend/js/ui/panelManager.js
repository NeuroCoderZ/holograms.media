// frontend/js/ui/panelManager.js - Модуль для управления панелями интерфейса

// --- Переменные модуля ---
let leftPanel = null;
let rightPanel = null;
let togglePanelsButton = null;

/**
 * Инициализирует состояние панелей (видимость/скрытие)
 */
function initializePanelState() {
  // Получаем ссылки на панели
  leftPanel = document.getElementById('left-panel');
  rightPanel = document.getElementById('right-panel');
  togglePanelsButton = document.getElementById('togglePanelsButton');
  
  // Проверяем наличие панелей
  if (!leftPanel || !rightPanel) {
    console.error('Не удалось найти панели интерфейса');
    return;
  }
  
  // Проверяем сохраненное состояние панелей в localStorage
  const isPanelsHidden = localStorage.getItem('isPanelsHidden') === 'true';
  
  // Устанавливаем начальное состояние на основе сохраненного значения
  if (isPanelsHidden) {
    leftPanel.classList.add('hidden');
    rightPanel.classList.add('hidden');
  } else {
    leftPanel.classList.remove('hidden');
    rightPanel.classList.remove('hidden');
  }
  
  console.log(`Состояние панелей инициализировано (${isPanelsHidden ? 'скрыты' : 'показаны'})`);
}

/**
 * Переключает видимость боковых панелей
 */
function togglePanels() {
  if (!leftPanel || !rightPanel) {
    console.error('Панели не инициализированы');
    return;
  }
  
  // Переключаем класс hidden для обеих панелей
  leftPanel.classList.toggle('hidden');
  rightPanel.classList.toggle('hidden');
  
  // Сохраняем состояние в localStorage
  const isPanelsHidden = leftPanel.classList.contains('hidden');
  localStorage.setItem('isPanelsHidden', isPanelsHidden);
  
  console.log(`Панели ${isPanelsHidden ? 'скрыты' : 'показаны'}`);
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

/**
 * Программно скрывает панели
 */
export function hidePanels() {
  if (leftPanel && rightPanel) {
    leftPanel.classList.add('hidden');
    rightPanel.classList.add('hidden');
    localStorage.setItem('isPanelsHidden', 'true');
  }
}

/**
 * Программно показывает панели
 */
export function showPanels() {
  if (leftPanel && rightPanel) {
    leftPanel.classList.remove('hidden');
    rightPanel.classList.remove('hidden');
    localStorage.setItem('isPanelsHidden', 'false');
  }
}

// Экспортируем функции для использования в других модулях
export { togglePanels };