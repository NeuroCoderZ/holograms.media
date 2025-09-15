// frontend/js/ai/prompts.js - Обработка промптов и взаимодействие с API

// import { ui } from '../core/ui.js'; // Replaced with state.uiElements
import { getSelectedModel } from './models.js';
// import { state } from '../core/init.js'; // Removed import

// Переменные состояния
let isPendingPrompt = false;

// Инициализация
export function initializePrompts(passedState) { // Changed signature
  console.log('Инициализация системы промптов...');
  
  // Проверяем наличие поля ввода
  if (!passedState.uiElements.inputs.topPromptInput) { // Use passedState
    console.error('Поле ввода промпта (topPromptInput) не найдено в state.uiElements!');
    return;
  }
  
  // Добавляем обработчик клавиш (уже должен быть в events.js)
  console.log('Система промптов инициализирована.');
}

// Отправка промпта
export async function sendPrompt(promptText, passedState) { // Added passedState
  // Проверяем наличие текста и что предыдущий запрос завершен
  if (!promptText || promptText.trim().length === 0 || isPendingPrompt) {
    return;
  }
  
  // Блокируем повторную отправку
  isPendingPrompt = true;
  
  try {
    // Показываем индикатор загрузки
    showLoadingIndicator(true);
    
    // Получаем выбранную модель
    const modelSelectElement = passedState.uiElements.inputs.modelSelect; // Get the element from passedState
    const selectedModel = getSelectedModel(modelSelectElement); // Pass the element
    
    // Собираем данные запроса
    const requestData = {
      prompt: promptText,
      model: selectedModel,
      context: {
        // Добавляем контекст из текущего состояния приложения
        // (например, информацию о текущей версии и т.д.)
        branch: passedState.currentBranch || 'main' // Use passedState
      }
    };
    
    // Отправляем запрос на сервер
    const response = await fetch('/prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    // Проверяем ответ
    if (!response.ok) {
      throw new Error(`Ошибка: ${response.status}`);
    }
    
    // Обрабатываем ответ
    const data = await response.json();
    if (data.success) {
      // Применяем результаты если есть операции с голограммой
      if (data.hologram) {
        applyHologramChanges(data.hologram);
      }
      
      // Если есть дополнительные сообщения, отображаем их
      if (data.message) {
        displayStatusMessage(data.message);
      }
      
      // Очищаем поле ввода если нужно
      if (data.clearInput && passedState.uiElements.inputs.topPromptInput) { // Use passedState
        passedState.uiElements.inputs.topPromptInput.value = '';
      }
    } else {
      throw new Error(data.error || 'Неизвестная ошибка');
    }
  } catch (error) {
    console.error('Ошибка при отправке промпта:', error);
    displayStatusMessage(`Ошибка: ${error.message}`, 'error');
  } finally {
    // Скрываем индикатор загрузки
    showLoadingIndicator(false);
    isPendingPrompt = false;
  }
}

// Вставить текст в поле промпта
export function insertTextIntoPrompt(text, passedState) { // Added passedState
  const promptInput = passedState.uiElements.inputs.topPromptInput; // Use passedState
  if (!promptInput) {
    console.error('Поле ввода промпта (topPromptInput) не найдено в state.uiElements для вставки текста!');
    return;
  }
  
  // Вставляем текст на позицию курсора
  const start = promptInput.selectionStart;
  const end = promptInput.selectionEnd;
  const currentValue = promptInput.value;
  
  // Объединяем текст с учетом позиции курсора
  promptInput.value = currentValue.substring(0, start) + text + currentValue.substring(end);
  
  // Устанавливаем курсор после вставленного текста
  promptInput.selectionStart = promptInput.selectionEnd = start + text.length;
  
  // Фокусируемся на поле ввода
  promptInput.focus();
}

// Применить изменения к голограмме
function applyHologramChanges(hologramData, passedState) { // Added passedState
  // TODO: Реализовать применение данных к голограмме
  console.log('Применение изменений к голограмме:', hologramData);
  
  // Обновляем текущее состояние голограммы
  if (hologramData.version) {
    passedState.currentVersion = hologramData.version; // Use passedState
    
    // Если есть обновленные версии, обновляем их
    if (hologramData.versions) {
      passedState.hologramVersions = hologramData.versions; // Use passedState
      
      // Обновляем интерфейс
      updateVersionsDisplay(passedState); // Pass passedState
    }
  }
}

// Обновление отображения версий
function updateVersionsDisplay(passedState) { // Added passedState
  const versionFrames = passedState.uiElements.containers.versionFrames; // Use passedState
  if (!versionFrames) {
    console.warn('Контейнер для версий (versionFrames) не найден в state.uiElements.containers, обновление отображения версий пропускается.');
    return;
  }
  
  // Очищаем текущее отображение
  versionFrames.innerHTML = '';
  
  // Добавляем новые версии
  passedState.hologramVersions.forEach((version, index) => { // Use passedState
    const versionFrame = document.createElement('div');
    versionFrame.className = 'version-frame';
    versionFrame.dataset.version = version.id;
    
    // Если это текущая версия, добавляем класс
    if (version.id === passedState.currentVersion) { // Use passedState
      versionFrame.classList.add('current');
    }
    
    // Добавляем метку времени
    const timeLabel = document.createElement('div');
    timeLabel.className = 'time-label';
    timeLabel.textContent = formatTimestamp(version.timestamp);
    versionFrame.appendChild(timeLabel);
    
    // Добавляем обработчик клика
    versionFrame.addEventListener('click', () => {
      // Активируем версию при клике
      activateVersion(version.id, passedState); // Pass passedState
    });
    
    // Добавляем в контейнер
    versionFrames.appendChild(versionFrame);
  });
}

// Активация версии
function activateVersion(versionId, passedState) { // Added passedState
  // Найти версию в списке
  const version = passedState.hologramVersions.find(v => v.id === versionId); // Use passedState
  if (!version) {
    console.error(`Версия ${versionId} не найдена!`);
    return;
  }
  
  // Обновляем текущую версию
  passedState.currentVersion = versionId; // Use passedState
  
  // Применяем данные голограммы
  // TODO: Реализовать применение данных к голограмме
  console.log('Активация версии:', versionId);
  
  // Обновляем интерфейс
  updateVersionsDisplay(passedState); // Pass passedState
}

// Вспомогательные функции

// Показать/скрыть индикатор загрузки
function showLoadingIndicator(show) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'block' : 'none';
  }
}

// Отображение статусного сообщения
function displayStatusMessage(message, type = 'info') {
  // Находим или создаем элемент для сообщений
  let statusElement = document.getElementById('statusMessage');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'statusMessage';
    document.body.appendChild(statusElement);
  }
  
  // Применяем класс в зависимости от типа
  statusElement.className = `status-message ${type}`;
  statusElement.textContent = message;
  statusElement.style.display = 'block';
  
  // Скрываем сообщение через 5 секунд
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 5000);
}

// Форматирование временной метки
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  
  // Получаем часы и минуты
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
} 