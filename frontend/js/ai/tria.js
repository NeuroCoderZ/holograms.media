// frontend/js/ai/tria.js - Взаимодействие с Tria и интеграция с Mistral

import { ui } from '../core/ui.js';
import { initializeModelSelector } from './models.js';

// Настройки Tria
export const triaConfig = {
  // Версия API
  apiVersion: '1.0',
  
  // Базовый URL для API
  apiUrl: '/api/tria',
  
  // Использовать Mistral в качестве базовой модели
  useMistralBackend: true,
  
  // Свойства модели
  model: {
    id: 'tria-v1',
    name: 'Tria',
    version: '1.0',
    contextWindow: 16000,
    maxOutputTokens: 4000
  }
};

// Инициализация Tria
export function initializeTria() {
  console.log('Инициализация Tria...');
  
  // Инициализируем селектор моделей
  initializeModelSelector();
  
  // Получаем конфигурацию с сервера
  // TODO: Backend endpoint /api/tria/config not implemented yet. Call disabled.
  /*
  fetchTriaConfiguration()
    .then(config => {
      console.log('Конфигурация Tria получена:', config);
      
      // Обновляем конфигурацию
      Object.assign(triaConfig, config);
      
      // Инициализируем интерфейс Tria
      setupTriaUI();
    })
    .catch(error => {
      console.error('Ошибка при получении конфигурации Tria:', error);
      // Продолжаем с дефолтной конфигурацией
      setupTriaUI();
    });
  */
  // Так как fetchTriaConfiguration закомментирован, вызываем setupTriaUI напрямую с дефолтной конфигурацией
  console.log('Пропускаем fetchTriaConfiguration, используем дефолтную конфигурацию Tria.');
  setupTriaUI();
  
  console.log('Инициализация Tria завершена.');
}

// Получение конфигурации с сервера
// TODO: Backend endpoint /api/tria/config not implemented yet. Function disabled.
/*
async function fetchTriaConfiguration() {
  try {
    const response = await fetch('/api/tria/config');
    if (!response.ok) {
      throw new Error(`Ошибка API: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Не удалось получить конфигурацию:', error);
    return {}; // Возвращаем пустой объект или дефолтную конфигурацию при ошибке
  }
}
*/

// Настройка интерфейса Tria
function setupTriaUI() {
  // Настраиваем кнопку Tria если она есть
  if (ui.buttons.triaButton) {
    ui.buttons.triaButton.addEventListener('click', () => {
      // Действие при нажатии на кнопку Tria
      // Например, открыть информацию о модели или настройки
      showTriaInfo();
    });
  }
  
  // Добавляем версию в заголовок (если есть)
  updateTriaVersionDisplay();
}

// Обновление отображения версии Tria
function updateTriaVersionDisplay() {
  const versionElement = document.getElementById('triaVersion');
  if (versionElement) {
    versionElement.textContent = triaConfig.model.version;
  }
}

// Показать информацию о Tria
function showTriaInfo() {
  // Находим или создаем модальное окно
  let triaInfoModal = document.getElementById('triaInfoModal');
  if (!triaInfoModal) {
    triaInfoModal = document.createElement('div');
    triaInfoModal.id = 'triaInfoModal';
    triaInfoModal.className = 'modal';
    triaInfoModal.innerHTML = `
      <div class="modal-content">
        <h2>Tria - Интерактивный интеллект</h2>
        <p>Версия: ${triaConfig.model.version}</p>
        <p>Использует Mistral: ${triaConfig.useMistralBackend ? 'Да' : 'Нет'}</p>
        <p>Контекстное окно: ${triaConfig.model.contextWindow} токенов</p>
        <p>Максимальная длина ответа: ${triaConfig.model.maxOutputTokens} токенов</p>
        <div class="modal-footer">
          <button id="closeTriaInfoButton">Закрыть</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(triaInfoModal);
    
    // Добавляем обработчик закрытия
    const closeButton = document.getElementById('closeTriaInfoButton');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        triaInfoModal.style.display = 'none';
      });
    }
    
    // Закрытие по клику вне модального окна
    triaInfoModal.addEventListener('click', (e) => {
      if (e.target === triaInfoModal) {
        triaInfoModal.style.display = 'none';
      }
    });
  }
  
  // Показываем модальное окно
  triaInfoModal.style.display = 'flex';
}

// Получение статистики использования Tria
export async function getTriaUsageStats() {
  try {
    const response = await fetch('/api/tria/stats');
    if (!response.ok) {
      throw new Error(`Ошибка API: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Не удалось получить статистику:', error);
    return {
      totalInteractions: 0,
      totalTokens: 0,
      averageResponseTime: 0
    };
  }
}