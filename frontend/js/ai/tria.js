// frontend/js/ai/tria.js - Взаимодействие с Tria и интеграция с Mistral

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
export function initializeTria(state) { // Changed signature
  console.log('Инициализация Tria...');
  
  // Инициализируем селектор моделей
  initializeModelSelector(state); // Pass state
  
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
  setupTriaUI(state); // Pass state
  
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
function setupTriaUI(state) { // Changed signature
  // Listener for triaButton is now handled in uiManager.js, which will call toggleTriaLearningMode.
  // The original functionality of showTriaInfo() on click is removed from this button's direct event path.
  // If showTriaInfo() is still desired, it needs a different trigger or to be integrated into the new flow.
  // if (ui.buttons.triaButton) { // This would become state.uiElements.buttons.triaButton
  //   ui.buttons.triaButton.addEventListener('click', () => {
  //     showTriaInfo(state); // Pass state if uncommented
  //   });
  // }
  
  // Добавляем версию в заголовок (если есть)
  updateTriaVersionDisplay(state); // Pass state
}

// Обновление отображения версии Tria
function updateTriaVersionDisplay(state) { // Changed signature
  const versionElement = state.uiElements.labels.triaVersion; // Changed to use state
  if (versionElement) {
    versionElement.textContent = triaConfig.model.version;
  }
}

// Показать информацию о Tria
function showTriaInfo(state) { // Changed signature
  // Находим или создаем модальное окно
  let triaInfoModal = state.uiElements.modals.triaInfoModal; // Changed to use state
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
    const closeButton = state.uiElements.buttons.closeTriaInfoButton; // Changed to use state
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

export function toggleTriaLearningMode(triaButton, modelSelect, state) {
    if (!state.tria) { state.tria = { isLearningActive: false }; }
    state.tria.isLearningActive = !state.tria.isLearningActive;
    const isActive = state.tria.isLearningActive;
    console.log(`Tria learning mode ${isActive ? 'activated' : 'deactivated'}.`);
    if (triaButton) {
        triaButton.classList.toggle('active', isActive);
        triaButton.title = isActive ? 'Деактивировать обучение Триа' : 'Активировать обучение Триа';
    }
    if (modelSelect) { modelSelect.disabled = isActive; }
}
