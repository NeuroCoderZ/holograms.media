// frontend/js/ai/models.js - Управление моделями ИИ

// Доступные модели (Model Lock 13.05.2026)
// Hermes Family (Tria Cortex v2.6): Personal Tria WINS over Global
export const models = {
  HERMES_MAIN: 'mistral-medium-3.5',      // Main: 128B, 256k ctx (released 29.04.2026)
  HERMES_SUB: 'mistral-small-latest',     // Architecture/Routing agent
  TRIA: 'tria',                           // Legacy fallback (internal logic)
};

// Метаданные моделей
export const modelMetadata = {
  'mistral-medium-3.5': {
    name: 'Hermes Main (Mistral Medium 3.5)',
    description: 'Основная модель — 128B параметров, 256k контекст',
    isDefault: true
  },
  'mistral-small-latest': {
    name: 'Hermes Sub (Mistral Small)',
    description: 'Архитектурный агент, роутинг',
    isDefault: false
  },
  'tria': {
    name: 'Tria (Legacy)',
    description: 'Внутренняя логика (fallback)',
    isDefault: false
  }
};

// Текущая выбранная модель (по умолчанию Hermes Main)
let selectedModel = 'mistral-medium-3.5'; 

// Получить текущую выбранную модель
export function getSelectedModel(modelSelectElement) {
  if (modelSelectElement) {
    return modelSelectElement.value;
  }
  return selectedModel;
}

// Установить выбранную модель
export function setSelectedModel(model, modelSelectElement) {
  selectedModel = model;
  
  if (modelSelectElement) {
    modelSelectElement.value = model;
  }
  
  try {
    localStorage.setItem('selectedModel', model);
  } catch (e) {
    console.warn('Не удалось сохранить выбранную модель:', e);
  }
  
  return true;
}

// Инициализация селекта моделей
export function initializeModelSelector(state) {
  const modelSelectElement = state.uiElements.inputs.modelSelect;
  if (!modelSelectElement) {
    return;
  }
  
  // Очищаем и заполняем
  modelSelectElement.innerHTML = '';
  
  // Generate options from modelMetadata (Model Lock 13.05.2026)
  Object.entries(modelMetadata).forEach(([modelId, meta]) => {
    const el = document.createElement('option');
    el.value = modelId;
    el.textContent = meta.name;
    if (meta.isDefault) {
      el.selected = true;
    }
    modelSelectElement.appendChild(el);
  });
  
  // Restore selection
  const saved = localStorage.getItem('selectedModel');
  if (saved) {
      modelSelectElement.value = saved;
      selectedModel = saved;
  }
  
  modelSelectElement.addEventListener('change', () => {
    setSelectedModel(modelSelectElement.value, modelSelectElement);
  });
}

export { selectedModel };
