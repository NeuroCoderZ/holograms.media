// frontend/js/ai/tria.js - Взаимодействие с Tria и интеграция с Mistral

import { initializeModelSelector } from './models.js';
import { API_BASE_URL } from '../services/apiService.js';

// Настройки Tria
export const triaConfig = {
  apiVersion: '1.0',
  apiUrl: `${API_BASE_URL}/api/v1/tria`, // Use absolute base URL
  useMistralBackend: true,
  model: {
    id: 'tria-v1',
    name: 'Tria',
    version: '1.0',
    contextWindow: 16000,
    maxOutputTokens: 4000
  }
};

/**
 * Отправляет промпт на бэкенд Tria и возвращает ответ.
 * @param {string} promptText - Текст запроса пользователя.
 * @param {string|null} sessionId - Опциональный ID сессии.
 * @returns {Promise<string>} - Текстовый ответ от Tria.
 */
export async function sendPromptToTria(promptText, sessionId = null) {
  const endpoint = `${triaConfig.apiUrl}/prompt`;
  console.log(`Sending prompt to Tria endpoint: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: promptText,
        session_id: sessionId
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`Tria Error: ${result.error}`);
    }

    return result.response; // Возвращаем текстовый ответ

  } catch (error) {
    console.error('Failed to send prompt to Tria:', error);
    // Возвращаем сообщение об ошибке, чтобы оно отобразилось в чате
    return `Ошибка при обращении к Tria: ${error.message}`;
  }
}


// Инициализация Tria
export function initializeTria(state) {
  console.log('Инициализация Tria...');
  initializeModelSelector(state);
  console.log('Пропускаем fetchTriaConfiguration, используем дефолтную конфигурацию Tria.');
  setupTriaUI(state);
  console.log('Инициализация Tria завершена.');
}

// Настройка интерфейса Tria
function setupTriaUI(state) {
  updateTriaVersionDisplay(state);
}

// Обновление отображения версии Tria
function updateTriaVersionDisplay(state) {
  const versionElement = state.uiElements.labels.triaVersion;
  if (versionElement) {
    versionElement.textContent = triaConfig.model.version;
  }
}

// Показать информацию о Tria
function showTriaInfo(state) {
  let triaInfoModal = state.uiElements.modals.triaInfoModal;
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
    const closeButton = state.uiElements.buttons.closeTriaInfoButton;
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        triaInfoModal.style.display = 'none';
      });
    }
    triaInfoModal.addEventListener('click', (e) => {
      if (e.target === triaInfoModal) {
        triaInfoModal.style.display = 'none';
      }
    });
  }
  triaInfoModal.style.display = 'flex';
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
