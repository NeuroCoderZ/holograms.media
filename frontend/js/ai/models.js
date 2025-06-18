// frontend/js/ai/models.js - Управление моделями ИИ

// import { ui } from '../core/ui.js'; // Replaced by passing modelSelectElement as parameter

// Доступные модели
export const models = {
  TRIA: 'tria',
  MISTRAL: 'mistral',
  GEMINI: 'gemini',
  OPENAI: 'openai',
  OPENROUTER: 'openrouter'
};

// Метаданные моделей
export const modelMetadata = {
  [models.TRIA]: {
    name: 'Tria',
    description: 'Наша собственная модель',
    isDefault: true
  },
  [models.MISTRAL]: {
    name: 'Mistral AI',
    description: 'Мощная открытая модель'
  },
  [models.GEMINI]: {
    name: 'Google Gemini',
    description: 'Multimodal AI от Google'
  },
  [models.OPENAI]: {
    name: 'OpenAI',
    description: 'GPT модели от OpenAI'
  },
  [models.OPENROUTER]: {
    name: 'OpenRouter',
    description: 'Доступ к множеству моделей'
  }
};

// Текущая выбранная модель
let selectedModel = models.TRIA;

// Получить текущую выбранную модель
export function getSelectedModel(modelSelectElement) {
  // Если селект доступен, берем значение из него
  if (modelSelectElement) {
    return modelSelectElement.value;
  }
  
  // Иначе возвращаем сохраненное значение (module-level fallback)
  return selectedModel;
}

// Установить выбранную модель
export function setSelectedModel(model, modelSelectElement) {
  // Проверяем, что модель валидна
  if (!Object.values(models).includes(model)) {
    console.error(`Неизвестная модель: ${model}`);
    return false;
  }
  
  // Обновляем модуль-уровневую переменную selectedModel
  selectedModel = model;
  
  // Если селект DOM элемент доступен, обновляем его
  if (modelSelectElement) {
    modelSelectElement.value = model;
  }
  
  // Сохраняем в локальное хранилище
  try {
    localStorage.setItem('selectedModel', model);
  } catch (e) {
    console.warn('Не удалось сохранить выбранную модель:', e);
  }
  
  return true;
}

// Инициализация селекта моделей
export function initializeModelSelector(state) { // Changed signature
  const modelSelectElement = state.uiElements.inputs.modelSelect; // Changed to use state
  if (!modelSelectElement) {
    console.warn('Элемент #modelSelect не найден, инициализация селектора моделей пропускается.');
    return;
  }
  // Присваиваем найденный элемент ui.inputs.modelSelect для дальнейшего использования в модуле, если это предполагается
  // Если ui.inputs.modelSelect должен быть инициализирован здесь, то это нужно сделать явно.
  // В текущей логике ui.inputs.modelSelect используется до этой функции, что может быть проблемой.
  // Пока что будем работать с modelSelectElement.
  
  // Очищаем текущие опции
  modelSelectElement.innerHTML = '';
  
  // Добавляем опции для каждой модели
  Object.entries(modelMetadata).forEach(([id, metadata]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = metadata.name;
    option.title = metadata.description;
    
    // Если это дефолтная модель, устанавливаем как выбранную
    if (metadata.isDefault) {
      option.selected = true;
    }
    
    modelSelectElement.appendChild(option);
  });
  
  // Восстанавливаем сохраненную модель
  try {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel && Object.values(models).includes(savedModel)) {
      // modelSelect.value = savedModel; // This will be set by setSelectedModel
      // selectedModel = savedModel; // This will be set by setSelectedModel
      setSelectedModel(savedModel, modelSelectElement); // Pass modelSelectElement here
    }
  } catch (e) {
    console.warn('Не удалось восстановить выбранную модель:', e);
  }
  
  // Добавляем обработчик изменения модели
  modelSelectElement.addEventListener('change', () => {
    setSelectedModel(modelSelectElement.value, modelSelectElement); // Pass element here
  });
}

// Экспортируем интерфейс модуля
// selectedModel (module-level variable) is still exported for potential direct read,
// but getSelectedModel(element) is preferred.
export { selectedModel };