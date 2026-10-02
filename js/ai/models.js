// frontend/js/ai/models.js - Управление моделями ИИ

// 2026-10-02 18:05 MSK — MISTRAL УБРАН ПО РЕШЕНИЮ ВЛАДЕЛЬЦА.
// Модели Mistral для голографических медиа не актуальны и в GUI больше не
// предлагаются. Важно: этот реестр перезаписывает разметку <option> в index.html
// (initializeModelSelector ниже), поэтому убрать Mistral только из HTML
// было недостаточно — он вернулся бы отсюда.
// Выбор модели теперь делегирован Hermes Router ('auto'): роутер сам решает,
// какая модель из LLM_POOL ответит (Code Arena WebDev). Актуальный пул —
// в AGENTS.md, раздел «КРИТИЧЕСКИЕ КОНСТАНТЫ» → LLM_POOL.
// Оплата за Mistral была платной, что противоречит запрету AGENTS.md.
export const models = {
  HERMES_MAIN: 'auto',                    // Hermes Router выбирает модель сам
  HERMES_SUB: 'auto',                     // Архитектурный агент/роутинг
  TRIA: 'tria',                           // Legacy fallback (internal logic)
};

// Метаданные моделей
export const modelMetadata = {
  'auto': {
    name: 'Auto — Hermes Router',
    description: 'Модель выбирается роутером автоматически из актуального LLM_POOL',
    isDefault: true
  },
  'tria': {
    name: 'Tria (Legacy)',
    description: 'Внутренняя логика (fallback)',
    isDefault: false
  }
};

// Текущая выбранная модель (по умолчанию авто-выбор роутером)
let selectedModel = 'auto'; 

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
  // 2026-10-02 18:05 MSK — валидируем сохранённое значение: у пользователей
  // в localStorage остался 'mistral-medium-3.5', которого больше нет в
  // modelMetadata. Без проверки <select> молча получал value без
  // соответствующего <option>, и бэкенд уходил в запрос несуществующей модели.
  const saved = localStorage.getItem('selectedModel');
  if (saved && modelMetadata[saved]) {
    modelSelectElement.value = saved;
    selectedModel = saved;
  } else {
    if (saved) {
      console.warn(`[Models] Модель "${saved}" больше недоступна, переключаюсь на авто-выбор роутера.`);
      localStorage.removeItem('selectedModel');
    }
    selectedModel = models.HERMES_MAIN;
  }
  
  modelSelectElement.addEventListener('change', () => {
    setSelectedModel(modelSelectElement.value, modelSelectElement);
  });
}

export { selectedModel };
