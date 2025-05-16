// frontend/js/ai/models.js - Управление моделями ИИ

import { ui } from '../core/ui.js';

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
export function getSelectedModel() {
  // Если селект доступен, берем значение из него
  if (ui.inputs.modelSelect) {
    return ui.inputs.modelSelect.value;
  }
  
  // Иначе возвращаем сохраненное значение
  return selectedModel;
}

// Установить выбранную модель
export function setSelectedModel(model) {
  // Проверяем, что модель валидна
  if (!Object.values(models).includes(model)) {
    console.error(`Неизвестная модель: ${model}`);
    return false;
  }
  
  // Обновляем модель
  selectedModel = model;
  
  // Если селект доступен, обновляем его
  if (ui.inputs.modelSelect) {
    ui.inputs.modelSelect.value = model;
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
export function initializeModelSelector() {
  const modelSelectElement = document.getElementById('modelSelect');
  if (!modelSelectElement) {
    console.warn('Элемент #modelSelect не найден, инициализация селектора моделей пропускается.');
    return;
  }
  // Присваиваем найденный элемент ui.inputs.modelSelect для дальнейшего использования в модуле, если это предполагается
  // Если ui.inputs.modelSelect должен быть инициализирован здесь, то это нужно сделать явно.
  // В текущей логике ui.inputs.modelSelect используется до этой функции, что может быть проблемой.
  // Пока что будем работать с modelSelectElement.

  const modelSelect = modelSelectElement; // Используем локальную переменную, полученную через getElementById
  // ui.inputs.modelSelect = modelSelectElement; // Если нужно обновить глобальный ui объект

  if (!modelSelect) { // Эта проверка становится избыточной, если предыдущая сработала
    console.warn('Селект моделей не найден (повторная проверка).');
    return;
  }
  
  // Очищаем текущие опции
  modelSelect.innerHTML = '';
  
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
    
    modelSelect.appendChild(option);
  });
  
  // Восстанавливаем сохраненную модель
  try {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel && Object.values(models).includes(savedModel)) {
      modelSelect.value = savedModel;
      selectedModel = savedModel;
    }
  } catch (e) {
    console.warn('Не удалось восстановить выбранную модель:', e);
  }
  
  // Добавляем обработчик изменения модели
  modelSelectElement.addEventListener('change', () => {
    setSelectedModel(modelSelectElement.value);
  });
}

// Экспортируем интерфейс модуля
export { selectedModel };