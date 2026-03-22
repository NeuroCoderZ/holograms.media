// frontend/js/ai/models.js - Управление моделями ИИ

// Доступные модели
export const models = {
  TRIA: 'tria', // Fallback internal logic
  MISTRAL: 'mistral-small-latest',
  GEMINI: 'gemini-3-flash-preview', // Or just 'gemini-3-flash' based on backend
  // Keeping keys consistent with metadata mapping below
};

// Метаданные моделей
export const modelMetadata = {
  'tria': { // Legacy/Default
    name: 'Tria (Default)',
    description: 'Интегрированный ИИ',
    isDefault: false
  },
  'mistral-small-latest': {
    name: 'Mistral 4 Small',
    description: 'Mistral AI',
    isDefault: false
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash',
    description: 'Google Gemini',
    isDefault: true
  }
};

// Текущая выбранная модель (по умолчанию Gemini)
let selectedModel = 'gemini-3-flash-preview'; 

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
  
  // Hardcode options logic to match index.html for safety
  // Or use metadata. 
  // Let's rely on metadata to generate options:
  const options = [
      { val: 'gemini/gemini-3-flash', txt: 'Gemini 3 Flash' },
      { val: 'mistral/mistral-large-latest', txt: 'Mistral 4 Small' } // Backend likely maps this string
  ];

  options.forEach(opt => {
      if (opt.val === selectedModel) return; // Task 3: Skip currently selected
      const el = document.createElement('option');
      el.value = opt.val;
      el.textContent = opt.txt;
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
