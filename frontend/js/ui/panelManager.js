// frontend/js/ui/panelManager.js
// Этот модуль отвечает за управление видимостью основных боковых панелей интерфейса (левой и правой).
// Он является центральным авторитетом для состояния видимости этих панелей,
// используя appStatePersistence.js для загрузки и сохранения этого состояния.
import { loadPanelsHiddenState, savePanelsHiddenState } from '../core/appStatePersistence.js';

// --- Переменные модуля ---
let leftPanel = null;
let rightPanel = null;
let togglePanelsButton = null;

/**
 * Инициализирует состояние видимости левой и правой боковых панелей.
 * Загружает сохраненное состояние (скрыты/показаны) с помощью appStatePersistence.js
 * и применяет его к панелям и кнопке переключения.
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
  const shouldBeHidden = loadPanelsHiddenState();

  console.log(`[DEBUG] Initializing panel state. Loaded state: ${shouldBeHidden}`);

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
 * Переключает видимость левой и правой боковых панелей.
 * Обновляет их CSS классы для отображения/скрытия и соответствующий класс кнопки переключения.
 * Сохраняет новое состояние видимости с помощью appStatePersistence.js.
 * Диспатчит событие 'resize' для обновления макета.
 */
export function togglePanels() {
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
  savePanelsHiddenState(willBeHidden);

  // Вызываем ресайз после переключения
  setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
  }, 50);

  console.log(`Панели ${willBeHidden ? 'скрыты' : 'показаны'}`);
}

/**
 * Инициализирует менеджер панелей.
 * Вызывает initializePanelState для установки начального состояния видимости панелей
 * и назначает обработчик события 'click' для кнопки переключения видимости панелей.
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