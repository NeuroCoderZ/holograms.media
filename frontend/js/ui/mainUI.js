// frontend/js/ui/mainUI.js - Модуль для инициализации основного UI и обработчиков событий

// Импортируем необходимые функции
import { loadChatHistory } from '../../script.js';

// Объект для хранения ссылок на DOM-элементы
const uiElements = {
  // Кнопки левой панели
  fileButton: null,
  playButton: null,
  pauseButton: null,
  stopButton: null,
  micButton: null,
  fullscreenButton: null,
  xrButton: null,
  gestureRecordButton: null,
  hologramListButton: null,
  scanButton: null,
  bluetoothButton: null,
  githubButton: null,
  telegramButton: null,
  installPwaButton: null,
  
  // Элементы правой панели
  chatButton: null,
  versionTimeline: null,
  chatHistory: null,
  
  // Контейнеры
  gridContainer: null,
  gestureArea: null,
  
  // Модальные окна
  modalWindows: null,
  
  // Другие элементы UI
  leftPanel: null,
  rightPanel: null
};

/**
 * Инициализирует состояние панелей (видимость/скрытие)
 */
function initializePanelState() {
  // Получаем ссылки на панели
  uiElements.leftPanel = document.getElementById('left-panel');
  uiElements.rightPanel = document.getElementById('right-panel');
  
  // Проверяем наличие панелей
  if (!uiElements.leftPanel || !uiElements.rightPanel) {
    console.error('Не удалось найти панели интерфейса');
    return;
  }
  
  // Устанавливаем начальное состояние (панели видимы)
  uiElements.leftPanel.classList.remove('hidden');
  uiElements.rightPanel.classList.remove('hidden');
  
  console.log('Состояние панелей инициализировано');
}

/**
 * Переключает видимость боковых панелей
 */
function togglePanels() {
  if (!uiElements.leftPanel || !uiElements.rightPanel) {
    console.error('Панели не инициализированы');
    return;
  }
  
  // Переключаем класс hidden для обеих панелей
  uiElements.leftPanel.classList.toggle('hidden');
  uiElements.rightPanel.classList.toggle('hidden');
  
  // Обновляем состояние в глобальной переменной (если она используется)
  if (window.isPanelsHidden !== undefined) {
    window.isPanelsHidden = uiElements.leftPanel.classList.contains('hidden');
  }
  
  console.log(`Панели ${uiElements.leftPanel.classList.contains('hidden') ? 'скрыты' : 'показаны'}`);
}

/**
 * Инициализирует обработчики событий для кнопок левой панели
 */
function initializeButtonHandlers() {
  // Обработчик для кнопки File
  if (uiElements.fileButton) {
    uiElements.fileButton.addEventListener('click', () => {
      console.log('Кнопка File нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки Play
  if (uiElements.playButton) {
    uiElements.playButton.addEventListener('click', () => {
      console.log('Кнопка Play нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки Pause
  if (uiElements.pauseButton) {
    uiElements.pauseButton.addEventListener('click', () => {
      console.log('Кнопка Pause нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки Stop
  if (uiElements.stopButton) {
    uiElements.stopButton.addEventListener('click', () => {
      console.log('Кнопка Stop нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки Mic
  if (uiElements.micButton) {
    uiElements.micButton.addEventListener('click', () => {
      console.log('Кнопка Mic нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки Fullscreen
  if (uiElements.fullscreenButton) {
    uiElements.fullscreenButton.addEventListener('click', () => {
      console.log('Кнопка Fullscreen нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки XR
  if (uiElements.xrButton) {
    uiElements.xrButton.addEventListener('click', () => {
      console.log('Кнопка XR нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки GestureRecord
  if (uiElements.gestureRecordButton) {
    uiElements.gestureRecordButton.addEventListener('click', () => {
      console.log('Кнопка GestureRecord нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки HologramList
  if (uiElements.hologramListButton) {
    uiElements.hologramListButton.addEventListener('click', () => {
      console.log('Кнопка HologramList нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки Scan
  if (uiElements.scanButton) {
    uiElements.scanButton.addEventListener('click', () => {
      console.log('Кнопка Scan нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки Bluetooth
  if (uiElements.bluetoothButton) {
    uiElements.bluetoothButton.addEventListener('click', () => {
      console.log('Кнопка Bluetooth нажата (заглушка)');
    });
  }
  
  // Обработчик для кнопки GitHub
  if (uiElements.githubButton) {
    uiElements.githubButton.addEventListener('click', () => {
      console.log('Кнопка GitHub нажата (заглушка)');
      window.open('https://github.com/holograms-media/holograms-media', '_blank', 'noopener,noreferrer');
    });
  }
  
  // Обработчик для кнопки Telegram
  if (uiElements.telegramButton) {
    uiElements.telegramButton.addEventListener('click', () => {
      console.log('Кнопка Telegram нажата (заглушка)');
      window.open('https://t.me/+WjtL4ipr-yljNGRi', '_blank', 'noopener,noreferrer');
    });
  }
  
  // Обработчик для кнопки InstallPWA
  if (uiElements.installPwaButton) {
    uiElements.installPwaButton.addEventListener('click', () => {
      console.log('Кнопка InstallPWA нажата (заглушка)');
    });
  }
  
  console.log('Обработчики кнопок инициализированы');
}

/**
 * Инициализирует основной UI приложения
 * Находит DOM-элементы, устанавливает начальное состояние и назначает обработчики событий
 */
export function initializeMainUI() {
  console.log('Инициализация основного UI...');
  
  // Получаем ссылки на DOM-элементы кнопок левой панели
  uiElements.fileButton = document.getElementById('fileButton');
  uiElements.playButton = document.getElementById('playButton');
  uiElements.pauseButton = document.getElementById('pauseButton');
  uiElements.stopButton = document.getElementById('stopButton');
  uiElements.micButton = document.getElementById('micButton');
  uiElements.fullscreenButton = document.getElementById('fullscreenButton');
  uiElements.xrButton = document.getElementById('xrButton');
  uiElements.gestureRecordButton = document.getElementById('gestureRecordButton');
  uiElements.hologramListButton = document.getElementById('hologramListButton');
  uiElements.scanButton = document.getElementById('scanButton');
  uiElements.bluetoothButton = document.getElementById('bluetoothButton');
  uiElements.githubButton = document.getElementById('githubButton');
  uiElements.telegramButton = document.getElementById('telegramButton');
  uiElements.installPwaButton = document.getElementById('installPwaButton');
  
  // Получаем ссылки на элементы правой панели
  uiElements.chatButton = document.getElementById('chatButton');
  uiElements.versionTimeline = document.getElementById('versionTimeline');
  uiElements.chatHistory = document.getElementById('chatHistory');
  
  // Получаем ссылки на контейнеры
  uiElements.gridContainer = document.getElementById('grid-container');
  uiElements.gestureArea = document.getElementById('gesture-area');
  
  // Получаем ссылки на модальные окна
  uiElements.modalWindows = document.querySelectorAll('.modal');
  
  // Инициализируем состояние панелей
  initializePanelState();
  
  // Инициализируем обработчики кнопок
  initializeButtonHandlers();
  
  console.log('Инициализация основного UI завершена');
  return true;
}

// Экспортируем функции для использования в других модулях
export { togglePanels };