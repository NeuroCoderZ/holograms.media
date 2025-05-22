// frontend/js/core/appStatePersistence.js - Модуль для сохранения и загрузки состояния приложения

const LOCAL_STORAGE_KEY = 'hologramsMediaAppState';

/**
 * Загружает состояние приложения из localStorage.
 * @returns {object | null} Объект с состоянием приложения или null, если состояние не найдено.
 */
function loadAppState() {
  try {
    const stateString = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stateString) {
      return JSON.parse(stateString);
    }
  } catch (error) {
    console.error("Ошибка при загрузке состояния из localStorage:", error);
  }
  return null;
}

/**
 * Сохраняет состояние приложения в localStorage.
 * @param {object} appState - Объект, содержащий полное состояние приложения.
 */
function saveAppState(appState) {
  try {
    const stateString = JSON.stringify(appState);
    localStorage.setItem(LOCAL_STORAGE_KEY, stateString);
  } catch (error) {
    console.error("Ошибка при сохранении состояния в localStorage:", error);
  }
}

/**
 * Загружает состояние видимости панелей из localStorage.
 * @returns {boolean | null} true, если панели должны быть скрыты, false, если показаны, null если состояние не найдено.
 */
export function loadPanelsHiddenState() {
  const appState = loadAppState();
  if (appState && typeof appState.panelsHidden !== 'undefined') {
    return appState.panelsHidden;
  }
  return null; // Состояние не найдено или не содержит panelsHidden
}

/**
 * Сохраняет состояние видимости панелей в localStorage.
 * @param {boolean} isHidden - true, если панели скрыты, false, если показаны.
 */
export function savePanelsHiddenState(isHidden) {
  const currentState = loadAppState() || {};
  currentState.panelsHidden = isHidden;
  saveAppState(currentState);
}
}