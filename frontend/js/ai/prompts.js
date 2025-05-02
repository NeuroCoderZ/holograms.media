// frontend/js/ai/prompts.js - Обработка промптов и взаимодействие с API

import { ui } from '../core/ui.js';
import { getSelectedModel } from './models.js';
import { state } from '../core/init.js';

// Переменные состояния
let isPendingPrompt = false;

// Инициализация
export function initializePrompts() {
  console.log('Инициализация системы промптов...');
  
  // Проверяем наличие поля ввода
  if (!ui.inputs.topPromptInput) {
    console.error('Поле ввода промпта не найдено!');
    return;
  }
  
  // Добавляем обработчик клавиш (уже должен быть в events.js)
  console.log('Система промптов инициализирована.');
}

// Отправка промпта
export async function sendPrompt(promptText) {
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
    const selectedModel = getSelectedModel();
    
    // Собираем данные запроса
    const requestData = {
      prompt: promptText,
      model: selectedModel,
      context: {
        // Добавляем контекст из текущего состояния приложения
        // (например, информацию о текущей версии и т.д.)
        branch: state.currentBranch || 'main'
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
      if (data.clearInput) {
        ui.inputs.topPromptInput.value = '';
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
export function insertTextIntoPrompt(text) {
  const promptInput = ui.inputs.topPromptInput;
  if (!promptInput) return;
  
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
function applyHologramChanges(hologramData) {
  // TODO: Реализовать применение данных к голограмме
  console.log('Применение изменений к голограмме:', hologramData);
  
  // Обновляем текущее состояние голограммы
  if (hologramData.version) {
    state.currentVersion = hologramData.version;
    
    // Если есть обновленные версии, обновляем их
    if (hologramData.versions) {
      state.hologramVersions = hologramData.versions;
      
      // Обновляем интерфейс
      updateVersionsDisplay();
    }
  }
}

// Обновление отображения версий
function updateVersionsDisplay() {
  const versionFrames = ui.containers.versionFrames;
  if (!versionFrames) return;
  
  // Очищаем текущее отображение
  versionFrames.innerHTML = '';
  
  // Добавляем новые версии
  state.hologramVersions.forEach((version, index) => {
    const versionFrame = document.createElement('div');
    versionFrame.className = 'version-frame';
    versionFrame.dataset.version = version.id;
    
    // Если это текущая версия, добавляем класс
    if (version.id === state.currentVersion) {
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
      activateVersion(version.id);
    });
    
    // Добавляем в контейнер
    versionFrames.appendChild(versionFrame);
  });
}

// Активация версии
function activateVersion(versionId) {
  // Найти версию в списке
  const version = state.hologramVersions.find(v => v.id === versionId);
  if (!version) {
    console.error(`Версия ${versionId} не найдена!`);
    return;
  }
  
  // Обновляем текущую версию
  state.currentVersion = versionId;
  
  // Применяем данные голограммы
  // TODO: Реализовать применение данных к голограмме
  console.log('Активация версии:', versionId);
  
  // Обновляем интерфейс
  updateVersionsDisplay();
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